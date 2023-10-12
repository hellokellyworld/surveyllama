//A function that takes a socket.io instance and return the list of sockets that are under namespace with roomId
//https://stackoverflow.com/questions/6563885/socket-io-how-do-i-get-a-list-of-connected-sockets-clients
//For socket.io version 2.0.3, the following code works:
function findClientsSocket(io, roomId, namespace) {
	var res = [],
		ns = io.of(namespace || "/"); // the default namespace is "/"

	if (ns) {
		for (var id in ns.connected) {
			if (roomId) {
				// ns.connected[id].rooms is an object!
				var rooms = Object.values(ns.connected[id].rooms);
				var index = rooms.indexOf(roomId);
				if (index !== -1) {
					res.push(ns.connected[id]);
				}
			} else {
				res.push(ns.connected[id]);
			}
		}
	}
	return res;
}

module.exorts = {
	findClientsSocket
};
