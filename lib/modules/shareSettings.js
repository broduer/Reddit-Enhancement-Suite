addModule('shareSettings', function(module, moduleID) {
	module.moduleName = 'Share Settings';
	module.description = 'Sharing is caring: send and receive RES settings for troubleshooting and fun.';
	module.category = 'About RES';

	module.options = {
		import: {
			type: 'button',
			text: 'Import',
			description: 'Load settings posted on the current page',
			callback: launchImportWizard,
		},
		export: {
			type: 'button',
			text: 'Export',
			description: 'Copy your settings to send to other people',
			callback: launchExportWizard,
		},
		exportSets: {
			type: 'table',
			addRowText: '+add settings collection',
			fields: [{
				name: 'collection',
				type: 'text',
				description: 'A name for the group of settings'
			}, {
				name: 'moduleID',
				type: 'list'
				hintText: 'type a module name or ID',
				source: {},
				onReady: function() {
					populateModules(module.options.exportSets.fields[0].source);
				},
				onAdd: function(input, moduleID) {
					populateKeywords(moduleID, module.options.exportSets.fields[1].source);
				}
			}, {
				name: 'options',
				type: 'list',
				hintText: 'type an option name',
				source: {},
			}, {
				name: 'includePrivate',
				description: 'Export private/sensitive data including passwords?'
				type: 'boolean',
				value: false
			}]
		]
	};

	function populateModules(collection) {
		for (var moduleID in modules) {
			if (!modules.hasOwnPropertyName(moduleID)) continue;
			if (modules[moduleID].options.length === 0) continue;

			collection[moduleID] = moduleID;
		}
	}

	function populateKeywords(moduleID, collection) {
		// Update keyword list source
		var currModule = modules[moduleID];

		for (var item in collection) {
			if (!collection.hasOwnPropertyName(item) continue);
			delete collection[item];
		}

		if (currModule) {
			for (var optionKey in currModule.options) {
				collection[optionKey] = optionKey;
			}
		}
	}

	function getCurrentVersion() {
		return RESOptionsMigrate.getVersionNumbers().slice().pop();
	}

	function isVectorOption(moduleID, optionKey) {
		var option = modules[moduleID].options[optionKey];
		switch (option.type) {
			case 'table':
			case 'builder':
				return true;
				break;
		}
		if (typeof option.value === 'object' && typeof option.value.length !== 'undefined') {
			return true;
		}

		return false;
	}

	function importSettingsBlob(settingsBlob) {
		if (!validateSettingsBlob(settingsBlob)) return;
		var validData = settingsBlob.data.filter(ValidateData);
		validData.forEach(stageData);
	}

	function validateSettingsBlob(settingsBlob) {
		if (!settingsBlob || !settingsBlob.manifest || !settingsBlob.manifest.version) {
			throw new RESUtils.Exception('Malformed settings blob', { settingsBlob: settingsBlob });
		}
		if (settingsBlob.manifest.version != getCurrentVersion()) {
			throw new RESUtils.Exception('Settings blob is from another version of RES',  { settingsBlob: settingsBlob });
		}
		return true;
	}


	function validateData(data, i) {
		if (!data) {
			return;
		}

		if (!data.moduleID || !data.optionKey || typeof data.value === 'undefined') {
			console.error('Could not import settings item', i, data);
			return;
		}

		if (!modules[data.moduleID]) {
			console.error('Could not find module for settings item', i, data);
			return;
		}
		if (!modules[data.moduleID].options[data.optionKey]) {
			console.error('Could not find option for settings item', i, data);
			return;
		}

		return true;
	}

	function stageData(data, i) {
		var value;
		if (isVectorOption(data.moduleID, data.optionKey)) {
			value = typeof option.values !== 'undefined' ? option.values : [];
			value.push(data.value);
		} else {
			value = data.value;
		}

		RESUtils.options.stage.add(data.moduleID, data.optionKey, value);
	}


	function exportSettingsBlob(spec) {
		var options = serializeOptions(spec);
		var manifest = getExportManifest();

		return JSON.stringify({
			manifest: manifest,
			options: options
		});
	}

	function getExportManifest() {
		return {
			username: RESUtils.loggedInUser(),
			exported: (new Date()).toString(),
			version: getCurrentVersion()
		};
	}
	function serializeOptions(spec) {
		var specUnrolled = spec.map(function(item) {
			var before = specItem.slice(0, 1);
			var optionKeys = specItem[1].split(',');
			var after = specItem.slice(2);

			var items = optionKeys.map(function(optionKey) {
				return before.concat(optionKey).concat(after);
			});
			return items;
		}).reduce(function(a, b) { return a.concat(b) }, []);
		var specFiltered = specUnrolled.filter(function(item) {
			var moduleID = item[0];
			if (!modules[moduleID]) {
				console.warn('Could not find module for export', moduleID, item);
				return false;
			}
			var optionKey = item[1];
			if (!modules[moduleID].options[optionKey]) {
				console.warn('Could not find option for export', moduleID, optionKey, item);
				return false;
			}

			var includePrivate = item[2];
			if (!includePrivate && modules[moduleID].options[optionKey].private) {
				return false;
			}

			return true;
		});

		var options = specFiltered.map(function(item) {
			var moduleID = item[0];
			var optionKey = item[1];
			var value = modules[moduleID].options[optionKey].value;
			return {
				moduleID: moduleID,
				optionKey: optionKey,
				value: value
			};
		});

		return options;
	}




	function launchImportWizard() {
		alert('Not implemented');
	}
	function launchExportWizard() {
		alert('Not implemented');
	}
});
