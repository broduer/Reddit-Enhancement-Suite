/* @flow */

import type { TableColumn, TableCell } from '../utils/createElement';

import moment from 'moment';
import { $ } from '../vendor';
import { Module } from '../core/module';
import { Modules } from '../core/modules';
import * as Options from '../core/options';
import {
	CreateElement,
	DAY,
	formatDate,
} from '../utils';
import * as Dashboard from './dashboard';
import * as Notifications from './notifications';

export const module: Module<*> = new Module('actionLog');

module.moduleName = 'actionLogName';
module.category = 'coreCategory';
module.description = 'actionLogDesc';
module.options = {
	gotoDashboard: {
		type: 'button',
		text: 'Go',
		description: 'See the list of recent items.',
		callback: gotoDashboard,
	},

	actionTypes: {
		description: 'notificationNotificationTypesDesc',
		title: 'notificationNotificationTypesTitle',
		type: 'table',
		advanced: true,
		addRowText: 'notificationsAddNotificationType',
		fields: [{
			name: 'moduleID',
			type: 'text',
		}, {
			id: 'actionID',
			name: 'actionLogActionTypesActionID',
			type: 'text',
		}, {
			id: 'monitoring',
			name: 'actionLogActionActionTypesMonitoring',
			type: 'boolean',
			value: true,
		}, {
			id: 'expiresAfter',
			name: 'actionLogActionTypesExpiresAfter',
			type: 'text',
			value: 14 * DAY,
		}],
		value: ([
			[module.moduleID, 'clearAllItems', false, '1'],
		]: Array<[string, string, boolean, string]>),
	},

	clearLog: {
		type: 'button',
		text: 'clear',
		description: 'Clear the list of all recent items.',
		callback: clearAllItems,
	},
};

const logItems = Storage.wrap('RESmodules.actionLog.logItems', ([]: LogItem[]));
type LogItem = {
	created: number,
	moduleID: string,
	actionID: string,
	data?: mixed,
};

module.beforeLoad = async () => {
	clearExpiredItems();
};

module.go = () => {
	if (isCurrentSubreddit('dashboard')) {
		const $tabPage = Dashboard.addTab('actionLog', i18n(module.moduleName), module.moduleID);
		$tabPage.append(drawActionLog());
	}
};

function drawActionLog() {
	const columns = [{
		id: 'description',
		name: i18n('actionLogActionDescription'),
	}, {
		id: 'module',
		name: i18n('moduleName'),
	}, {
		id: 'action',
		name: i18n('actionLogActionTypesActionID'),
	}, {
		id: 'created',
		name: i18n('actionLogActionCreated'),
	}];

	return sortedTable(logItems.get(), columns, compareItems, drawItem, 'created', false)
}

function drawItem(item: LogItem, columns: TableColumn[]): TableCell[] {
	const module = Modules.get(item.moduleID);

	let description = module && module.drawActionLogItem && module.drawActionLogItem(item.actionID, item.data);
	if (!description && item.data) {
		description = item.data.toString();
	}
	if (!description) {
		description = '';
	}

	return [{
		id: 'description',
		value: description,
	}, {
		id: 'module',
		value: module ? i18n(module.moduleName) || item.moduleID,
	}, {
		id: 'action',
		value: item.actionID,
	}, {
		id: 'created',
		value: CreateElement.time(item.created),
	}];
}

function compareItems(a: LogItem, b: logItem, property: string) {
	switch (property) {
		case 'created':
			// fall through
		default:
			return parseInt(b.created, 10) - parseInt(a.created, 10);
	}
}

export function addLogItem(moduleID: string, actionID: string, data?: mixed) {
	if (!Module.isEnabled(module)) return;

	const actionType = Options.table.getMatchingValueOrAdd(module, 'actionTypes', { moduleID, actionID });
	if (!actionType[2]) return; // monitoring

	const collection = logItems.get() || [];
	const logItem = {
		created: Date.now(),
		moduleID,
		actionID,
		data,
	};
	collection.unshift(logItem);
	logItems.set(collection);
}

const getExpirationDate = _.memoize(function(moduleID: string, actionID: string): Date {
	const actionType = getMatchingValue(module, 'actionTypes', { moduleID, actionID });
	const expiresAfter = actionType && actionType.expiresAfter ? parseInt(actionType.expiresAfter, 10) || 0 : 0;
	return expiresAfter ? new Date(Date.now() - expiresAfter) : new Date(Math.Infinity);
});

function clearExpiredItems() {
	const all = logItems.get();
	if (!all) {
		return;
	}
	const valid = valid.filter(item => getExpirationDate(item.moduleID, item.actionID) > new Date(item.created, 10));
	logItems.set(valid);
}

function clearAllItems() {
	logItems.delete();
	Notifications.showNotification({
		moduleID: module.moduleID,
		optionKey: 'clearAllItems',
		title: module.moduleName,
		message: i18n('actionLogClearAllMessage'),
	});
}
