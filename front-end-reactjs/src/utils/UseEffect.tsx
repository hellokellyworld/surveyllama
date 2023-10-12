// import * as React from "react";
import { useEffect } from "react";
/**
 * function to provide onLoad and onUnmount entries for class components
 * to initialize and clean up data (e.g. addListener , removeListener )
 * @param props.onLoad,
 * @param props.onUmount
 * @access public
 * @return empty div
 */
function UseEffect(props: any) {
	useEffect(() => {
		props.onLoad();
		return function onUnmount() {
			props.onUnmount();
		};
		//below comment suppresses the ESLint warning of missing dependency with empty dependency array []
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // empty dependency array = only called on mount and unmount
	return <></>;
}

export default UseEffect;
