import { Regex, SomeCompanionConfigField } from '@companion-module/base'

export interface NsgModuleConfig {
	host?: string
	port?: string
}

export function getConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target host',
			tooltip: 'The host of the NodeCG instance',
			width: 6,
			default: '127.0.0.1',
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Port',
			tooltip: 'The port of the NodeCG instance',
			width: 6,
			regex: Regex.NUMBER,
			default: '9090',
		},
	]
}
