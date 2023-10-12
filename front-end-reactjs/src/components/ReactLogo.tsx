/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 */

export function ChatbotLogo(props: JSX.IntrinsicElements["img"]) {
	return (
		<img
			width="100%"
			height="100%"
			src="https://www.clipartmax.com/png/small/96-968421_space-and-astronomy-robot-icon-transparent-background.png"
			{...props}
		></img>
	);
}
export function UserLogo(props: JSX.IntrinsicElements["img"]) {
	return (
		<img
			width="100%"
			height="100%"
			src="https://www.citypng.com/public/uploads/preview/profile-user-round-black-icon-symbol-hd-png-11639594326nxsyvfnkg9.png?v=2023050508"
			{...props}
		></img>
	);
}
