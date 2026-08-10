import { theme as antdTheme } from 'antd';

const light = {
	algorithm: antdTheme.defaultAlgorithm,
	token: {
		colorPrimary: '#0b5fff',
		colorBgBase: '#ffffff',
		colorTextBase: '#000000',
	},
};

const dark = {
	algorithm: antdTheme.darkAlgorithm,
	token: {
		// Matches the .dark CSS-variable palette in index.css (deep navy +
		// electric blue), so AntD components (Table, Select, Modal, etc.)
		// visually match the rest of the app's dark mode instead of AntD's
		// own default blue-gray.
		colorPrimary: '#3B82F6',
		colorBgBase: '#04080F',
		colorTextBase: '#F8FAFC',
	},
};

export function getAntdTheme(mode = 'light'){
	return mode === 'dark' ? dark : light;
}

export default { light, dark };
