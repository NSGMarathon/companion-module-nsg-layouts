export function isBlank(value?: string | null): boolean {
	return value === null || value === undefined || String(value).trim() === ''
}

export function prettyPrintList(arr: Array<string>): string {
	return arr.reduce((result, item, index) => {
		result += item;

		if (index === arr.length - 2) {
			result += ' & ';
		} else if (index !== arr.length - 1) {
			result += ', ';
		}

		return result;
	}, '');
}

export function formatCurrencyAmount(number: number, alwaysShowDecimals = false): string {
	// i don't like this solution, but it works how i want it to
	if (alwaysShowDecimals || number % 1 !== 0) {
		return new Intl.NumberFormat('et-EE', { useGrouping: 'min2', minimumFractionDigits: 2 }).format(number).replaceAll(',', '.');
	} else {
		return new Intl.NumberFormat('et-EE', { useGrouping: 'min2', minimumFractionDigits: 0 }).format(number);
	}
}
