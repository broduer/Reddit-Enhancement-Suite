import _ from 'lodash';
import submitIssueDefaultBodyTemplate from '../templates/submitIssueDefaultBody.mustache';
import submitWizardTemplate from '../templates/submitWizard.mustache';
import diagnosticsTemplate from '../templates/diagnostics.mustache';
import * as Metadata from '../core/metadata';
import { $ } from '../vendor';
import * as Hover from './hover';
import { BrowserDetect, observe, regexes, getUrlParams, click } from '../utils';
import { ajax } from '../environment';
import * as NightMode from './nightMode';

export const module = {};

module.moduleID = 'submitWizard';
module.moduleName = 'Post Submission Wizard';
module.category = 'Submissions';
module.alwaysEnabled = true;

module.description = 'If you have any problems with RES, visit <a href="/r/RESissues">/r/RESissues</a>. If you have any requests or questions, visit <a href="/r/Enhancement">/r/Enhancement</a>.';
module.include = ['submit'];

const domain = '.reddit.com';
const subreddits = ['enhancement', 'resissues'];
const subredditsForDiagnostics = ['beta', 'help', 'resbetatesting'];

let submitText;

module.go = () => {
	submitText = document.querySelector('.submit_text');
	observe(submitText, { childList: true }, mutation => updateRulesWizard);

	watchForSubmitLinkClick();
};

const diagnostics = _.once(() => diagnosticsTemplate({
	nightMode: NightMode.isNightModeOn(),
	version: Metadata.version,
	browser: BrowserDetect.browser,
	browserVersion: BrowserDetect.version,
	cookies: navigator.cookieEnabled,
	beta: $('.beta-hint').length > 0,
}));



function updateRulesWizard() {
	const description = $('.submit_text .md > *').clone();
	const title = $('.submit_text h1').text();

	// TODO: kill old guider first
	if (!description.length) {
		Hover.infocard(module.moduleID).close();
		return;
	}

	Hover.infocard(module.moduleID)
		.target('form.submit .tabmenu')
		.options({
			width: 475,
			closeOnMouseOut: false,
			pin: Hover.pin.right,
		})
		.populateWith([$('<div />').text(title), description])
		.begin();
}


function watchForSubmitLinkClick() {
	$(document.body).on('click', 'a[href*="/submit"]', e => {
		if (e.which !== 1 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;

		const oldValues = $('form.submit').serializeArray();
		const updated = updateSubmitForm(e.target);
		if (updated) {
			e.preventDefault();
			history.pushState(oldValues, document.title, e.target.href);
		}
	});
}

function updateSubmitForm(submitLink) {
	if (!submitLink.hostname.endsWith(domain)) return;
	const [match, subreddit] = regexes.submit.exec(submitLink.pathname);
	if (!match) return;

	const fields = getUrlParams();
	fields.subreddit = subreddit;

	_.forEach(fields, changeInput);
	if (fields.url) {
		changeSubmitTab('link');
	} else if (fields.text) {
		changeSubmitTab('text');
	}

	return true;
}

function changeSubmitTab(which) {
	const selectors = {
		'link': '.submit .link-button',
		'text': '.formtab .text-button',
	};
	const tab = document.querySelector(selectors[which])
	if (tab) {
		click(tab);
	}
}

function changeInput(value, name) {
	if (typeof value === 'undefined') return;

	const input = document.querySelector(`form.submit [name="${name}"]`);
	if (!input) return;

	const old = input.value;

	switch (input.tagName) {
		case 'INPUT':
			input.value = value;
			break;
		case 'TEXTAREA':
			if (input.value.indexOf(value) === -1) {
				input.value = value + (input.value ? ' ' + input.value : '');
			}
			break;
	}

	if (input.value !== old) {
		const e = new Event('change');
		e.res = true;
		input.dispatchEvent(e);
	}
}
