/*
Sprite
canvas 元件基类
*/
define([
],function(){
	window.inherits = (function () {
		function callSuper () {
			var caller = callSuper.caller;
			var $name = caller.__name;
			var $class = caller.__class;
			if($name){//是其他函数
				var superFun = $class.prototype.__proto__[$name];
			}else{//是构造函数
				var superFun = caller.prototype.__proto__.constructor;
			}
			superFun.apply(this, arguments);
		}
		function inherits (constructor, sub, superClass) {
			var agent = {
				constructor: constructor
			};
			if(!superClass){
				agent.__proto__ = {callSuper: callSuper};
			}else{
				agent.__proto__ = superClass.prototype;
			}
			for(var key in sub){
				if(sub.hasOwnProperty(key) && typeof(sub[key]) == 'function'){
					sub[key].__name = key;
					sub[key].__class = constructor;
				}
				agent[key] = sub[key];
			}
			constructor.prototype = agent;
		}
		return inherits;
	})();
	function getPolyPoints () {
		var ga = this.position();
		var points = [];
		for(var i = 0; i < this.points.length; i++){
			var x = this.points[i].x;
			var y = this.points[i].y;
			if(this.rotate != 0){
				var sinB = Math.sin(this.rotate);
				var cosB = Math.cos(this.rotate);

				var tx = x * cosB - y * sinB;
				var ty = x * sinB + y * cosB;
				x = tx;
				y = ty;
			}
			points.push({x: x + ga.x,y: y + ga.y});
		}
		return points;
	}
	//判断A是否包含B
	var Contain = {
		circle_point: function(cx, cy, cr, px, py){
			return ((px-cx)*(px-cx)+(py-cy)*(py-cy) < cr*cr);
		},
		circle_circle: function(c0x, c0y, c0r, c1x, c1y, c1r){
			return ((c0x-c1x)*(c0x-c1x)+(c0y-c1y)*(c0y-c1y) < (c0r-c1r)*(c0r-c1r));
		},
		circle_poly: function(cx, cy, cr, p){
			for(var i = 0, il = p.length; i < il; i++){
				if(Contain.circle_point(cx, cy, cr, p[i].x, p[i].y)) return true;
			}
			return false;
		},
		//目前只支持凸多边形
		poly_point: function(poly, x, y){
			var count1 = 0;
			var count2 = 0;
			var l = poly.length;
			for(var i = 0, j = l - 1; i < l; j = i++){
				var value = (x - poly[j].x) * (poly[i].y - poly[j].y) - (y - poly[j].y) * (poly[i].x - poly[j].x);
				if (value > 0){
					++count1;
				}else if(value < 0){
					++count2;
				}
			}
			return (0 == count1 || 0 == count2);
		}
	}
	//判断A是否与B相交
	var Collision = {
		circle_point: Contain.circle_point,
		circle_circle: function(c0x, c0y, c0r, c1x, c1y, c1r){
			return ((c0x-c1x)*(c0x-c1x)+(c0y-c1y)*(c0y-c1y) < (c0r+c1r)*(c0r+c1r));
		},
		poly_point: Contain.poly_point,
		poly_circle: function(poly, cx, cy, cr){
			if(Collision.poly_point(poly, cx, cy))
				return true;
			
			var l = poly.length;
			for(var i = 0, j = l - 1; i < l; j = i++){
				if(Collision.circle_segment(cx, cy, cr, poly[j], poly[i]))
					return true;
			}
			return false;
		},
		circle_segment: function(pcx, pcy, r, p0, p1){
			var v1x = p1.x - p0.x, v1y = p1.y - p0.y,
				v2x = pcx - p0.x, v2y = pcy - p0.y,
				v3x = pcx - p1.x, v3y = pcy - p1.y;
			
			//如果任何一个顶点在圆内，则相交
			if(v2x*v2x + v2y*v2y < r*r)
				return true;
			if(v3x*v3x + v3y*v3y < r*r)
				return true;
			
			//如果圆心相对线段的投影不在线段上，则不相交
			var dot1 = (v3x*v1x + v1y*v3y);
			var dot2 = (v2x*v1x + v1y*v2y);
			if(dot1 > 0 || dot2 < 0) return false;
			
			//如果圆心到直线的垂线长度小于圆的半径，则相交
			var mti = (v1x*v2y - v2x*v1y);
			var h2 = mti * mti / (v1x*v1x + v1y*v1y);
			return r * r > h2;
		},
		segment_segment: function(p1, p2, p3, p4){
			//跨立实验
			var v1, v2, v3, r1, r2;
			v1x = p1.x - p3.x, v1y = p1.y - p3.y;
			v2x = p2.x - p3.x, v2y = p2.y - p3.y;
			v3x = p4.x - p3.x, v3y = p4.y - p3.y;
			r1 = (v1x*v3y - v3x*v1y) * (v2x*v3y - v3x*v2y);

			v1x = p3.x - p1.x, v1y = p3.y - p1.y;
			v2x = p4.x - p1.x, v2y = p4.y - p1.y;
			v3x = p2.x - p1.x, v3y = p2.y - p1.y;
			r2 = (v1x*v3y - v3x*v1y) * (v2x*v3y - v3x*v2y);
			
			return (r1 <= 0 && r2 <= 0);
		},
		poly_segment: function(po, p0, p1){
			var l = po.length;
			for(var i = 0, j = l - 1; i < l; j = i++){
				if(Collision.segment_segment(p0, p1, po[i], po[j])){
					return true;
				}
			}
			return false;
		},
		//这个检查方法不够完全，当两个长条形状跨立相交是就没办法了
		poly_poly: function(p0, p1){
			for(var i = 0, il = p0.length; i < il; i++){
				if(Contain.poly_point(p1, p0[i].x, p0[i].y)){
					return true;
				}
			}

			for(var i = 0, il = p1.length; i < il; i++){
				if(Contain.poly_point(p0, p1[i].x, p1[i].y)){
					return true;
				}
			}
			return false;
		}
	}
	function Sprite (parent, info) {
		info = info || {};
		if(parent){
			this.parent = parent;
			this.parent.addChild(this);
		}
		this.children = [];
		this.x = info.x || 0;
		this.y = info.y || 0;
		this.z = info.z || 0;
		this.rotate = info.rotate || 0;
		this.speed = info.speed || 0;
	}
	Sprite.SHAPE = {
		NONE: -1,
		POINT: 0,
		CIRCLE: 1,
		RECT: 2,
		POLY: 3,
		SEGMENT: 4,
		MUTIPART: 5
	}
	inherits(Sprite, {
		shape: Sprite.SHAPE.NONE,
		setPos: function(x, y){
			this.x = x;
			this.y = y;
			this._gCache = null;
		},
		setRotate: function(rotate){
			this.rotate = rotate
			this._gCache = null;
		},
		setZ: function(z){
			this.z = z;
			if(this.parent) this.parent.zArranged = false;
		},
		/* update()
		 * 新的一帧开始
		 */
		update: function(){
			//移动
			var r = this.rotate;
			if(this.rotateDetla)
				r += this.rotateDetla;
			this.x -= this.speed * Math.sin(r);
			this.y += this.speed * Math.cos(r);
			for(var i = 0; i < this.children.length; i++){
				this.children[i].update();
			}
			this._gCache = null;
			this.onUpdate && this.onUpdate();
		},
		/* draw(ctx)
		 * 绘制时调用
		 */
		draw: function(ctx){
			//进行坐标变换，并绘制
			ctx.save();
				ctx.translate(this.x, this.y);
				ctx.rotate(this.rotate);
				this._draw(ctx);
				if(!this.zArranged){
					this.children.sort(function(a, b){
						return a.z - b.z;
					});
					this.zArranged = true;
				}
				for(var i = 0; i < this.children.length; i++){
					this.children[i].draw(ctx);
				}
				this.draw_(ctx);
			ctx.restore();
		},
		/* _draw(ctx)
		 * 绘制子元素之前调用
		 */
		_draw: function(ctx){},
		/* draw_(ctx)
		 * 绘制子元素之后调用
		 */
		draw_: function(ctx){},
		/* override position()
		 * 计算绝对位置
		 * override position(obj)
		 * 计算obj相对于当前sprite的位置
		 */
		position: function(obj){
			if(arguments.length == 1){
				var pa = this.position();
				var gx = pa.x, gy = pa.y, cc = obj, pos = [];
				while(cc.parent){
					pos.push(cc);
					cc = cc.parent;
				}
				while(cc = pos.pop()){
					gx -= cc.x;
					gy -= cc.y;
					if(cc.rotate != 0){
						var sinB = Math.sin(-cc.rotate);
						var cosB = Math.cos(-cc.rotate);

						var tx = gx * cosB - gy * sinB;
						var ty = gx * sinB + gy * cosB;
						gx = tx;
						gy = ty;
					}
				}
				return {x: gx, y: gy};
			}else{
				//缓存
				if(this._gCache){return this._gCache;}
				var x = 0, y = 0, cc = this;
				while(cc.parent){
					if(cc.rotate != 0){
						var sinB = Math.sin(cc.rotate);
						var cosB = Math.cos(cc.rotate);

						var tx = x * cosB - y * sinB;
						var ty = x * sinB + y * cosB;
						x = tx;
						y = ty;
					}
					x += cc.x;
					y += cc.y;
					cc = cc.parent;
				}
				//缓存
				this._gCache = {x: x, y: y};
				return {x: x, y: y};
			}
		},
		/* addChild(child)
		 * 增加一个child
		 */
		addChild: function(child){
			child.remove();
			this.children.push(child);
			child.parent = this;
			this.zArranged = false;
		},
		/* removeChild(child)
		 * 将child从子元素中移除
		 */
		removeChild: function(child){
			var index = this.children.indexOf(child);
			if(index != -1){
				this.children.splice(index, 1);
			}
			child.parent = null;
		},
		/* remove()
		 * 当前元素从其父元素中移除
		 */
		remove: function(){
			this.parent && this.parent.removeChild(this);
		},
		/*判断b是否相交*/
		collide: function(b){
			var a = this;
			if(a.points){
				var pa = getPolyPoints.call(a);
			}else{
				var ga = a.position();
			}
			if(b.points){
				var pb = getPolyPoints.call(b);
			}else{
				var gb = b.position();
			}
			if(a.shape == Sprite.SHAPE.POINT){
				if(b.shape == Sprite.SHAPE.CIRCLE){
					return Collision.circle_point(gb.x, gb.y, b.r, ga.x, ga.y);
				}else if(b.shape == Sprite.SHAPE.POLY){
					return Collision.poly_point(pb, ga.x, ga.y);
				}
			}else if(a.shape == Sprite.SHAPE.CIRCLE){
				if(b.shape == Sprite.SHAPE.POINT){
					return Collision.circle_point(ga.x, ga.y, a.r, gb.x, gb.y);
				}else if(b.shape == Sprite.SHAPE.CIRCLE){
					return Collision.circle_circle(ga.x, ga.y, a.r, gb.x, gb.y, b.r);
				}
			}else if(a.shape == Sprite.SHAPE.SEGMENT){
				if(b.shape == Sprite.SHAPE.CIRCLE){
					return Collision.circle_segment(gb.x, gb.y, b.r, pa[0], pa[1]);
				}else if(b.shape == Sprite.SHAPE.POLY){
					return Collision.poly_segment(pb, pa[0], pa[1]);
				}
			}else if(a.shape == Sprite.SHAPE.POLY){
				if(b.shape == Sprite.SHAPE.POINT){
					return Collision.poly_point(pa, gb.x, gb.y);
				}else if(b.shape == Sprite.SHAPE.CIRCLE){
					return Collision.poly_circle(pa, gb.x, gb.y, b.r);
				}else if(b.shape == Sprite.SHAPE.SEGMENT){
					return Collision.poly_segment(pa, pb[0], pb[1]);
				}else if(b.shape == Sprite.SHAPE.POLY){
					return Collision.poly_poly(pa, pb);
				}
			}else{
				alert("collide shape not supported");
			}
			return false;
		},
		contain: function(b){
			var a = this;
			var ga = a.position();
			var gb = b.position();
			if(a.shape == Sprite.SHAPE.CIRCLE){
				if(b.shape == Sprite.SHAPE.POINT){
					return Contain.circle_point(ga.x, ga.y, a.r, gb.x, gb.y);
				}else if(b.shape == Sprite.SHAPE.CIRCLE){
					return Contain.circle_circle(ga.x, ga.y, a.r, gb.x, gb.y, b.r);
				}else if(b.shape == Sprite.SHAPE.POLY){
					var points = getPolyPoints.call(b);
					return Contain.circle_poly(ga.x, ga.y, a.r, points)
				}
			}else if(a.shape == Sprite.SHAPE.POLY){
				var points = getPolyPoints.call(a);
				if(b.shape == Sprite.SHAPE.POINT){
					return Contain.poly_point(points, gb.x, gb.y);
				}else if(b.shape == Sprite.SHAPE.CIRCLE){

				}
			}else{
				alert("contain shape not supported");
			}
			return false;
		}
	});
	return Sprite;	
});