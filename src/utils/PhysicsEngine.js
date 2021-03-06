var Utils = require('./Utils');

class PhysicsEngine {
	needsToMove(p) {
		return (p.player.downX || p.player.downY);
	}
	objectCollision(p, mx, my) {
		/*
			TODO: Only check collision of
			objects around the player 
		*/
		var me = this;
		var objs = me.objs.objs;
		var inBox = false;
		for (var j = 0; j < objs.length; ++j) {
			var obj = objs[j];
			var s = obj.scale / 2;
			var hitBox = [
				[obj.x - s, obj.y - s],
				[obj.x - s, obj.y + s],
				[obj.x + s, obj.y + s],
				[obj.x + s, obj.y - s]
			];
			inBox = (Utils.inPolygon([
				mx,
				my
			], hitBox));
			if (inBox) {
				break;
			}
		}
		return !inBox;
	}
	inEntity(p, entity, s) {
		var x1 = p.x;
		var y1 = p.y;

		var x2 = entity.x;
		var y2 = entity.y;
		var hitBox = [
			[x2 - s, y2 - s],
			[x2 - s, y2 + s],
			[x2 + s, y2 + s],
			[x2 + s, y2 - s]
		];
		return (Utils.inPolygon([
				x1,
				y1
			], hitBox));
	}
	playerCollision(p, mx, my) {
		// Method is called within the context of the GameServer
		/*
			TODO: Only check collision of
			players around the player 
		*/
		var me = this;
		var inBox = false;
		for (var j = 0; j < me.manager.players.length; ++j) {
			var p2 = me.manager.players[j];
			if (p == p2
				|| p2.player.alive === false
				|| p2.player.spawned === false)
				continue;
			var px = p2.player.x;
			var py = p2.player.y;
			var s = p2.player.scale;
			var hitBox = [
				[px - s, py - s],
				[px - s, py + s],
				[px + s, py + s],
				[px + s, py - s]
			];
			/*
			console.log(hitBox);
			console.log(s);
			*/
			inBox = (Utils.inPolygon([
				mx,
				my
			], hitBox));
			if (inBox) {
				break;
			}
		}
		return !inBox;
	}
	getAttackLocation(p) {
		var me = this;
		var a = p.player.angle;
		var x = p.player.x;
		var y = p.player.y;
		var d = p.player.attackDist;
		var x2 = (d * Math.cos(a)) + x;	
		var y2 = (d * Math.sin(a)) + y;
		return [
			x2,
			y2	
		];
	}
	movePlayer(p) {
		// This method is called within the context of the GameServer
		var me = this;
		// The current PhysicsEngine instance
		var phys = me.phys;
		// Move player
		var mx = p.player.x;
		var my = p.player.y;
		var speed = me.config.playerSpeed;
		if (Utils.isInSnow(p)) {
			speed = me.config.snowSpeed;
		}
		if (p.player.downX) {
			// The player needs to be translated across the X axis
			if (p.player.dirX == "l") {
				// Player moves left
				mx = p.player.x - speed;
			} else if (p.player.dirX == "r") {
				// Player moves right
				mx = p.player.x + speed;
			}
		}
		if (p.player.downY) {
			// The player needs to be translated across the Y axis
			if (p.player.dirY == "u") {
				// Player moves up
				my = p.player.y - speed;
			} else if (p.player.dirY == "d") {
				// Player moves down
				my = p.player.y + speed;
			}
		}
		return [
			mx,
			my
		];
	}
	borderCollision(mx, my) {
		var me = this;
		var mvx = Utils.coordInBounds(mx, me.config.mapSize);
		var mvy = Utils.coordInBounds(my, me.config.mapSize);
		return [
			mvx,
			mvy
		];
	}
	constructor(serv) {
		this.serv = serv;
	}
}

module.exports = PhysicsEngine;