var Player = require('../entities/Player');
var log = require('../utils/Logger');
const PACKET = require('../utils/packetCodes');

class PlayerManager {
	updateTime(socket) {
		var t = this.gameServer.gameTime;
		socket.emit('dtv', t);
	}
	addPlayer(socket, player) {
		socket.emit(PACKET.PLAYER_ADD, player.player.getData(), false);
	}
	addSelfPlayer(socket) {
		socket.emit(PACKET.PLAYER_ADD, socket.player.getData(), true);
	}
	sendRawUpdate(socket, rawData) {
		socket.emit(PACKET.PLAYER_UPDATE, rawData);
	}
	removeIndex(i) {
		this.players.splice(i, 1);
	}
	sendStart(socket) {
		socket.emit(PACKET.PLAYER_START, socket.player.sid);
	}
	sendChat(source, recipient, msg) {
		recipient.emit(PACKET.CHAT, source.player.sid, msg);
	}
	sendObj(socket, data) {
		socket.emit(PACKET.LOAD_GAME_OBJ, data);
	}
	updateStore(socket, type, storeId) {
		socket.emit(PACKET.UPDATE_STORE, type, storeId);
	}
	sendUpgrades(socket, upgradePoints, age) {
		socket.emit(PACKET.UPGRADES, upgradePoints, age);
	}
	hideUpgrades(socket) {
		this.sendUpgrades(socket, 0, 0);
	}
	syncPlayerItems(socket) {
		socket.emit(PACKET.UPDATE_ITEMS, socket.player.items, 0);
		socket.emit(PACKET.UPDATE_ITEMS, socket.player.weapons, 1);
	}
	playerAge(socket) {
		this.sendUpgrades(socket, socket.player.upgradePoints, socket.player.age);
	}
	sendAttack(to, from, hit) {
		var wcode = from.player.weaponCode;
		if (wcode == 1)
			wcode = 0;
		// Emit attack
		to.emit(PACKET.GATHER_ANIM,
				from.player.sid,
				hit | 0,
				wcode);
	}
	updateStat(socket, statName, statValue, updateUI) {
		socket.emit(PACKET.STAT_UPDATE, statName, statValue, updateUI | 0);
	}
	updateXP(socket) {
		socket.emit(PACKET.UPDATE_AGE,
					socket.player.xp,
					socket.player.maxXP,
					socket.player.age);
	}
	updateMaterials(socket) {
		this.updateStat(socket, "stone", socket.player.stone, true);
		this.updateStat(socket, "wood", socket.player.wood, true);
		this.updateStat(socket, "food", socket.player.food, true);
		this.updateXP(socket);
	}
	updateHealth(socket) {
		var near = socket.player.playersNear;
		for (var i = 0; i < near.length; ++i) {
			near[i].emit(PACKET.UPDATE_HEALTH,
						 socket.player.sid,
						 socket.player.health);
		}
	}
	kill(socket) {
		socket.player.alive = false;
		log.all(socket.player.name + ' has been killed');
		// TODO: Maybe add more kill handling
	}
	getNearPlayers(player, avoidSelf) {
		// Get all the players close to "player"
		var x = player.player.x;
		var y = player.player.y;
		// Create a square to search for players within it
		var x1 = x - this.gameServer.config.updateRadius;
		var x2 = x + this.gameServer.config.updateRadius;
		var y1 = y - this.gameServer.config.updateRadius;
		var y2 = y + this.gameServer.config.updateRadius;

		var players = this.gameServer.manager.players;
		var near = [];
		for (var i = 0; i < players.length; ++i) {
			var px = players[i].player.x;
			var py = players[i].player.y;
			if ((x1 <= px  && px <= x2) &&
				 (y1 <= py  && py <= y2)) {
					// The player is within the square
					if (players[i].player.alive) {
						if (players[i] == player && avoidSelf) {
							continue;
						}
						near.push(players[i]);
					}
					if (!player.player.playersNear.includes(players[i]) && players[i] != player) {
						// Emit player add to the socket
						this.addPlayer(player, players[i]);
						player.player.playersNear.push(players[i]);
					}
			}
		}
		if (!avoidSelf)
			player.player.playersNear = near;
		return near;
	}
	hitObject(socket, object) {
		log.all(socket.player.name + ' has hit a ' + object.constructor.name);
		var near = socket.player.playersNear;
		// Emit object wiggle to surrounding players
		for (var i = 0; i < near.length; ++i) {
			var n = near[i];
			n.emit(PACKET.WIGGLE, socket.player.angle, object.sid);
		}
		// Update player stats
		socket.player.gather(object,
							this.gameServer.config.gatherMultiplier);
		// Send the player their new stats
		this.updateMaterials(socket);
	}
	hitPlayer(p1, p2) {
		// Only take damage if players are on different teams
		if (!p1.player.clan ||
			!p2.player.clan ||
			!(p1.player.clan.name === p2.player.clan.name)) {
			log.all(p1.player.name + ' has hit ' + p2.player.name);
			p2.player.hitFrom(p1);
			var me = this;
			if (p2.player.isDead) {
				p2.player.alertDeath();
				me.kill(p2);
				p1.player.killScore(p2);
			} else {
				// Just update health
				this.updateHealth(p2);
			}
		}
	}
	getBySID(sid) {
		for (var i = 0; i < this.players.length; ++i) {
			if (this.players[i].player.sid === sid) return this.players[i];
		}
		return null;
	}
	close(socket, reason) {
		for (var i = 0; i < this.players.length; ++i) {
			if (socket.player.sid == this.players[i].player.sid) {
				log.info('Closing socket for "' + reason + '"');
				socket.emit(PACKET.DISCONN, reason);
				socket.disconnect(reason);
				this.removeIndex(i);
				return;
			}
		}
	}
	add(socket) {
		socket.player = new Player(socket, this.players.length, this.gameServer);
		this.players.push(socket);
	}
	remove(socket) {
		for (var i = 0; i < this.players.length; ++i) {
			if (this.players[i].player.sid == socket.player.sid) {
				this.removeIndex(i);
				break;
			}
		}
	}
	constructor(gameServer) {
		this.gameServer = gameServer;
		this.players = [];
	}
}
module.exports = PlayerManager;