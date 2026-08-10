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
		colorPrimary: '#5ea3ff',
		colorBgBase: '#0b1220',
		colorTextBase: '#ffffff',
	},
};

export function getAntdTheme(mode = 'light'){
	return mode === 'dark' ? dark : light;
}

export default { light, dark };
