const light = {
	token: {
		colorPrimary: '#0b5fff',
		colorBgBase: '#ffffff',
		colorBgContainer: '#ffffff',
		colorText: '#000000',
	},
};

const dark = {
	token: {
		colorPrimary: '#5ea3ff',
		colorBgBase: '#0b1220',
		colorBgContainer: '#1c1c1e',
		colorText: '#ffffff',
	},
};

export function getAntdTheme(mode = 'light'){
	return mode === 'dark' ? dark : light;
}

export default { light, dark };
