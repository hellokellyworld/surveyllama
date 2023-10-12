//make sure cors origin is fixed to a few hosts and ports
//and also only allow 443 or 80
export const fixedOrigin = (hosts) => {
	const isPortPresent = /(https?:\/\/.*):(\d*)\/?(.*)/g;
	return hosts.map((host) => {
		// eslint-disable-next-line no-eq-null, eqeqeq
		if (host.indexOf("https:") !== -1 && host.match(isPortPresent) == null) {
			return host.concat(":443"); //add 443 for https
		}
		// eslint-disable-next-line no-eq-null, eqeqeq
		if (host.indexOf("http:") !== -1 && host.match(isPortPresent) == null) {
			return host.concat(":80"); //add 80 for http
		}
		return host;
	});
};
