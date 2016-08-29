var awjs =
{
	DIR_LEFT: 1,
	DIR_UP: 2,
	DIR_DOWN: 4,
	DIR_RIGHT: 8,

	_pc: 0,
	_stack: [],
	_vectors: [],
	_vectors2: [],
	_paused: [],
	_paused2: [],
	_data: null,
	_palette: null,
	_vars: [],
	_curPalette: 0,
	_useAux: false,
	_end: false,
	_ctx: null,
	_currentPage1: 0,
	_currentPage2: 0,
	_currentPage3: 0,
	_frameCounter: 0,
	_useTimer: false,
	_stopAtFrame: 0,
	_button: 0,

	_logger: document.getElementById("logger"),
	_loggerEnabled: false,

	_base64decode: function(data)
	{
		// decoder from http://phpjs.org/functions/base64_decode:357

		var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
 
		data += '';
 
		do 
		{  
			h1 = b64.indexOf(data.charAt(i++));
			h2 = b64.indexOf(data.charAt(i++));
			h3 = b64.indexOf(data.charAt(i++));
			h4 = b64.indexOf(data.charAt(i++));
 	
			bits = h1<<18 | h2<<12 | h3<<6 | h4;
 	
			o1 = bits>>16 & 0xff;
			o2 = bits>>8 & 0xff;
			o3 = bits & 0xff;
 	
			if (h3 == 64) 
			{
				tmp_arr[ac++] = String.fromCharCode(o1);
			} 
			else if (h4 == 64) 
			{
				tmp_arr[ac++] = String.fromCharCode(o1, o2);
			} 
			else 
			{
				tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
			}
		}
		while (i < data.length);
 
		dec = tmp_arr.join('');
		return dec;
	},

	_preloadScripts: function()
	{
		file017 = this._base64decode(file017);
		file023 = this._base64decode(file023);
		file024 = this._base64decode(file024);
		file025 = this._base64decode(file025);

		// get this ord() thing out of the way
		var p = [];
		for (var i=0; i<file024.length; i++)
		{
			p[i] = file024.charCodeAt(i);
		}

		this._data = p;
	},

	log: function(s)
	{
		if (this._loggerEnabled)
		{
			// <pre> is faster on rendering (chrome at least)
			this._logger.innerHTML += "<pre style='padding: 0; margin: 0;'>" + s + "\n</pre>";
		}
	},

	clearLog: function()
	{
		if (this._loggerEnabled)
		{
			document.getElementById("logger").innerHTML = "";
		}
	},

	_getByte: function()
	{
		return this._data[this._pc++];
	},

	_getWord: function()
	{
		var c = this._data[this._pc++] << 8;
		c |= this._data[this._pc++];
		return c;
	},

	_getShort: function()
	{
		var w = this._getWord();
		return this.toShort(w);
	},

	_skipBytes: function(c)
	{
		this._pc += c;
	},

	_getPaletteColor: function(index)
	{
		var ptr = (this._curPalette * 32) + (index * 2);

		var c1 = file023.charCodeAt(ptr+0);
		var c2 = file023.charCodeAt(ptr+1);
		var r = ((c1 & 0x0f) << 4) + (c1 & 0xf);
		var g = (c2 & 0xf0) + (c2 >> 4);
		var b = ((c2 & 0x0f) << 4) + (c2 & 0xf);
		return "rgb(" + r + "," + g + "," + b + ")";
	},

	_getScreenAddress: function(screen)	
	{
		switch(screen)
		{
			case 0:
			case 1:
			case 2:
			case 3:
			case 4:
			return screen;

			case 0xff:
			return this._currentPage3;

			case 0xfe:
			return this._currentPage2;

			default:
			// oh oh
			return 0;
		}
	},

	_fillScreen: function(screen, color)
	{
		this.log("fillScreen " + screen + " " + this._getPaletteColor(color));

		this._fillScreenRGB(screen, this._getPaletteColor(color));
	},

	_fillScreenRGB: function(screen, rgb)
	{
		this._ctx.fillStyle = rgb;
		screen = this._getScreenAddress(screen);
		this._ctx.fillRect(0, 400*screen, 640, 400);
	},

	_updateDisplay: function(src)
	{
		src = this._getScreenAddress(src);
		var top = -400*src;
		this._canvas.setStyle = {top: top + "px"};
	},

	// performs a nearest neighbor x2 scale up
	/*
	_updateDisplayOld: function(src)
	{
		src = this._getScreenAddress(src);
		var ctx = this._viewport.getContext("2d");

		var dstRow = ctx.createImageData(640, 1);

		for (var y=0; y<200; y++)
		{
			var srcRow = this._ctx.getImageData(0, src*200+y, 320, 1);

			var d = dstRow.data;
			var dp = 0;
			var sp = 0;
			var s = srcRow.data;
			for (var x=0; x<320; x++)
			{
				d[dp++] = s[sp++];
				d[dp++] = s[sp++];
				d[dp++] = s[sp++];
				d[dp++] = s[sp++];
				sp -= 4;
				d[dp++] = s[sp++];
				d[dp++] = s[sp++];
				d[dp++] = s[sp++];
				d[dp++] = s[sp++];
			}

			ctx.putImageData(dstRow, 0, y*2+0);
			ctx.putImageData(dstRow, 0, y*2+1);
		}
	},
	*/

	_copyScreen: function(src, dst)
	{
		this.log("copyScreen " + src + " -> " + dst + " (" + this._getScreenAddress(dst) + ")");

		if (src > 3 && src < 0xfe)
		{
			src &= 3;
		}

		src = this._getScreenAddress(src);
		dst = this._getScreenAddress(dst);

		var dummy = this._ctx.getImageData(0, src*400, 640, 400);
		this._ctx.putImageData(dummy, 0, dst*400);
	},

	executeScripts: function()
	{
		for (var i=0; i<64; i++)
		{
			if (this._paused[i] == 0 && this._vectors[i] != 0xffff)
			{
				// valid
				this.log("running vector " + i);
				this._pc = this._vectors[i];
				this._stack = [];
				this._executeScript();
				this._vectors[i] = this._pc;
			}
		}
	},

	getGraphicsByteAt: function(off)
	{
		return this._useAux ? file017.charCodeAt(off) : file025.charCodeAt(off);
	},

	_drawShapeParts: function(off, zoom, x, y)
	{
		this.log("drawShapeParts " + off + " " + x + " " + y);

		var cx = x - (this.getGraphicsByteAt(off++) * zoom / 0x40);
		var cy = y - (this.getGraphicsByteAt(off++) * zoom / 0x40);
		var n = this.getGraphicsByteAt(off++);

		while (n >= 0)
		{
			var off2 = (this.getGraphicsByteAt(off) << 8) | this.getGraphicsByteAt(off+1);
			off += 2;

			var px = cx + (this.getGraphicsByteAt(off++) * zoom / 0x40);
			var py = cy + (this.getGraphicsByteAt(off++) * zoom / 0x40);
			var color = 0xff;
			var bp = off2;
			off2 &= 0x7fff;
			if (bp & 0x8000)
			{
				color = this.getGraphicsByteAt(off++) & 0x7f;
				off++;
			}

			off2 = (off2*2) & 0xffff;
			this._drawShape(off2, color, zoom, px, py);

			n--;
		}
	},

	_fillPolygon: function(off, color, zoom, x, y)
	{
		//this.log("fillPoly " + color + " " + zoom + " " + x + " " + y);
		var zoom2 = zoom / 64.0;

		var bbw = this.getGraphicsByteAt(off++) * zoom2;
		var bbh = this.getGraphicsByteAt(off++) * zoom2;
		var npoints = this.getGraphicsByteAt(off++);
		this.log("  bbw " + bbw + " bbh " + bbh + " " + npoints);
		var points = [];
		for (var i=0; i<npoints; i++)
		{
			var tx = this.getGraphicsByteAt(off++) * zoom2;
			var ty = this.getGraphicsByteAt(off++) * zoom2;
			points[i] = {x:tx, y:ty};
			//this.log("    point(" + i + "): " + tx + " " + ty);
		}

		var x1 = x - bbw/2;
		var x2 = x + bbw/2;
		var y1 = y - bbh/2;
		var y2 = y + bbh/2;

		//this.log("x1 " + x1 + " y1 " + y1 + " " + x2 + " " + y2);

		if (x1 > 319 || x2 < 0 || y1 > 199 || y2 < 0)
		{
			return;
		}

		var top = this._currentPage1*400;

		this._ctx.fillStyle = this._getPaletteColor(color);

		// points are different case
		if (npoints == 4 && bbw == 0 && bbh == 1)
		{
			this._ctx.fillRect(x1*2, top+y1*2, 2, 2);
			return;
		}

		this._ctx.beginPath();
		this._ctx.moveTo(x1*2, top+y1*2);

		for (var i=0; i<npoints; i++)
		{
			var tox = x1 + points[i].x;
			var toy = y1 + points[i].y;
			this._ctx.lineTo(tox*2, top+toy*2);
			//this.log("   lineTo " + (tox) + ", " + (top+toy));
		}

		this._ctx.closePath();
		this._ctx.fill();
	},

	_clipScreen: function()
	{
		var top = this._currentPage1*400;

		this._ctx.beginPath();
		this._ctx.moveTo(0, top);
		this._ctx.lineTo(640, top);
		this._ctx.lineTo(640, top+400);
		this._ctx.lineTo(0, top+400);
		this._ctx.clip();
		this._ctx.closePath();
	},

	_drawString: function(index, x, y, c)
	{
		this._drawStringRGB(index, x, y, this._getPaletteColor(c));
	},

	_drawPixelRGB: function(x, y, rgb)
	{
		var top = this._currentPage1*400;

		this._ctx.fillStyle = rgb;
		this._ctx.fillRect(x, top+y, 1, 1);
	},

	_drawCharRGB: function(ch, x, y, rgb)
	{
		var off = (ch.charCodeAt(0) - 32)*8;

		for (var _y=0; _y<8; _y++)    
		{
			var s = "";

			for (var _x=0; _x<8; _x++)
			{
				var b = (font[off+_y] << _x) & 0x80;
				if (b)
				{
					this._drawPixelRGB(x+_x, y+_y, rgb);
				}
			}

			this.log(s);
		}
	},

	_drawStringRGB: function(index, x, y, rgb)
	{
		this._ctx.save();
		this._clipScreen();

		for (var i=0; i<gameStrings.length; i++)
		{
			if (gameStrings[i][0] == index)
			{
				var s = gameStrings[i][1];
				for (var j=0; j<s.length; j++)
				{
					this._drawCharRGB(s.charAt(j), x+j*8, y, rgb);
				}

				break;
			}
		}

		this._ctx.restore();
	},

	_drawShape: function(off, color, zoom, x, y)
	{
		this.log("drawShape " + off + " " + x + " " + y + " " + this._getPaletteColor(color));

		var i = this.getGraphicsByteAt(off++);
		if (i >= 0xc0)
		{
			if (color & 0x80)
			{
				color = i & 0x3f;
			}

			// hack
			color &= 0xf;

			this._fillPolygon(off, color, zoom, x, y);
		}
		else
		{
			i = i & 0x3f;
			if (i == 2)
			{
				this._drawShapeParts(off, zoom, x, y);
			}
		}
	},

	toShort: function(i)
	{
		if (i >= 0x8000)
		{
			return i - 0x10000;
		}

		return i;
	},

	toUnsigned: function(i)
	{
		if (i >= 0)
		{
			return i & 0xffff;
		}
		else
		{
			return (0x10000 + i) & 0xffff;
		}
	},

	_executeScript: function()
	{
		var halt = false;

		while (halt == false) 
		{
			var op = this._getByte();
			this.log("opcode " + op + " at " + (this._pc - 1));
			if (op & 0x80)
			{
				var off = ((op << 8) | this._getByte()) * 2;
				off &= 0xffff;
				this._useAux = false;
				var x = this._getByte();
				var y = this._getByte();
				var h = y - 199;
				if (h > 0)
				{
					y = 199;
					x += h;
				}

				this._ctx.save();
				this._clipScreen();
				this._drawShape(off, 0xff, 0x40, x, y);
				this._ctx.restore();
			}
			else if (op & 0x40)
			{
				var off = this._getWord() << 1;
				off &= 0xffff;
				this._useAux = false;
				var x = this._getByte();

				switch(op & 0x30)
				{
					case 0x30:
					x += 0x100;
					break;

					case 0x10:
					x = this._vars[x];
					break;

					case 0x00:
					x = (x << 8) | this._getByte();
					x = this.toShort(x);
					break;
				}
					
				/*
				if (op & 0x20)
				{
					if (op & 0x10)
					{
						x += 0x100;
					}
				}
				else
				{
					if (op & 0x10)
					{
						x = this._vars[x];
					}
					else
					{
						x = (x << 8) | this._getByte();
						x = this.toShort(x);
					}
				}
				*/

				var y = this._getByte();
				if ((op & 0x8) == 0)
				{
					if ((op & 0x04) == 0)
					{
						y = (y << 8) | this._getByte();
						y = this.toShort(y);
					}
					else
					{
						y = this._vars[y];
					}
				}

				var zoom = this._getByte();
				if ((op & 0x2) == 0)
				{
					if ((op & 1) == 0)
					{
						this._pc--;
						zoom = 0x40;
					}
					else
					{
						zoom = this._vars[zoom];
					}
				}
				else
				{
					if (op & 0x1)
					{
						this._pc--;
						this._useAux = true;
						zoom = 0x40;
					}
				}

				this._ctx.save();
				this._clipScreen();
				this._drawShape(off, 0xff, zoom, x, y);
				this._ctx.restore();
			} 
			else 
			{
				switch(op)
				{
					case 0x00:
					// mov imm16
					var i = this._getByte();
					this._vars[i] = this._getShort();
					this.log("got i=" + i + " v=" + this._vars[i]);
					break;

					case 0x01:
					// mov var
					var i = this._getByte();
					var j = this._getByte();
					this._vars[i] = this._vars[j];
					break;

					case 0x02:
					// add var
					var i = this._getByte();
					var j = this._getByte();
					this._vars[i] += this._vars[j];
					break;				

					case 0x03:
					// add imm16
					var i = this._getByte();
					var v = this._getShort();
					this._vars[i] += v;
					break;	

					case 0x04:
					// call
					var off = this._getWord();
					this.log("call " + off);
					this._stack.push(this._pc);
					this._pc = off;
					break;
		
					case 0x05:
					// ret
					this.log("ret");
					this._pc = this._stack.pop();
					break;

					case 0x06:
					// break thread
					this.log("break");
					this.log("");
					halt = true;
					break;

					case 0x07:
					// jump imm16
					var off = this._getWord();
					this.log("jmp " + off);
					this._pc = off;
					break;

					case 0x08:
					// set vector for next execution
					var i = this._getByte();
					var off = this._getWord();
					this.log("setVector2 " + i + " to " + off);
					this._vectors2[i] = off;
					break;

					case 0x09:
					// dbnz
					var i = this._getByte();
					this.log("dbnz " + i);
					this._vars[i]--;
					var off = this._getWord();
					if (this._vars[i] != 0)
					{
						this._pc = off;
					}
					break;

					case 0x0a:
					// compare
					var cmp = this._getByte();
					this.log("compare " + cmp);
					var b = this._vars[this._getByte()];
					var a;
					if (cmp & 0x80)
					{
						a = this._vars[this._getByte()];
					}
					else if (cmp & 0x40)
					{
						a = this._getShort();
					}
					else
					{
						a = this._getByte();
					}

					var test = false;
					switch (cmp & 0x07)
					{
						case 0: test = (a == b); break;
						case 1: test = (a != b); break;
						case 2: test = (a < b); break;
						case 3: test = (a <= b); break;
						case 4: test = (a > b); break;
						case 5: test = (a >= b); break;
					}
					
					var off = this._getWord();
					if (test)
					{
						this._pc = off;
					}
					break;

					case 0x0b:
					// set palette 
					this._curPalette = this._getByte();
					this.log("set palette " + this._curPalette);
					this._getByte();
					break;

					case 0x0c:
					// reset script
					var j = this._getByte() & 0x3f;
					var i = this._getByte() & 0x3f;
					var n = i - j;
					if (n >= 0)
					{
						n++;
						var al = this._getByte();
						if (al == 2)
						{
							for (var p=0; p<n; p++)
							{
								this._vectors2[p+j] = 0xfffe;
							}
						}
						else if (al < 2)
						{
							for (var p=0; p<n; p++)
							{
								this._paused2[p+j] = al;
							}
						}
					}
					break;

					case 0x0d:
					// set drawing page
					var page = this._getByte();
					this.log("SELECT PAGE " + page);
					this._currentPage1 = this._getScreenAddress(page);
					break;

					case 0x0e:
					// fill screen with color
					var s = this._getByte();
					var c = this._getByte();
					this._fillScreen(s, c);
					break;

					case 0x0f:
					// disregarding h scroll
					var i = this._getByte();
					var j = this._getByte();
					this._copyScreen(i, j);
					break;

					case 0x10:
					// update display
					var page = this._getByte();
					this.log("** Update display " + page + " **");
					// handle keeps
					this._vars[0xf7] = 0;
					// sleep 

					if (page != 0xfe)
					{
						if (page == 0xff)
						{
							var t = this._currentPage2;
							this._currentPage2 = this._currentPage3;
							this._currentPage3 = t;
						}
						else
						{
							this._currentPage2 = this._getScreenAddress(page);
						}
					}

					this._updateDisplay(this._currentPage2);
					break;

					case 0x11:
					// kill vector
					halt = true;
					this._pc = 0xffff;
					break;

					case 0x12:
					// draw string
					var i = this._getWord();
					var x = this._getByte();
					var y = this._getByte();
					var c = this._getByte();
					this._drawString(i, x*8, y, c);
					break;

					case 0x13:
					// sub var
					var i = this._getByte();
					var j = this._getByte();
					this._vars[i] -= this._vars[j];
					break;				

					case 0x14:
					// and imm16
					var i = this._getByte();
					var v = this._getWord();
					this._vars[i] = this.toShort(this.toUnsigned(this._vars[i]) & v);
					break;				

					case 0x15:
					// or imm16
					var i = this._getByte();
					var v = this._getWord();
					this._vars[i] = this.toShort(this.toUnsigned(this._vars[i]) | v);
					break;				

					case 0x16:
					// shl imm16
					var i = this._getByte();
					var v = this._getShort();
					this._vars[i] <<= v;
					break;				

					case 0x17:
					// shr imm16
					var i = this._getByte();
					var v = this._getShort();
					this._vars[i] >>= v;
					break;				

					case 0x18:
					// sound & music
					this._skipBytes(5);
					break;

					case 0x19:
					// load resource (background bitmap)
					this._getWord();
					break;

					case 0x1a:
					// sound & music
					this._skipBytes(5); 
					break;
				}
			}
		}
	},

	_initScripts: function()
	{
		for (var i=0; i<64; i++)
		{
			this._vectors[i] = 0xffff;
			this._vectors2[i] = 0xffff;
			this._paused[i] = 0;
			this._paused2[i] = 0;
		}

		this._vectors2[0] = 0;

		for (var i=0; i<256; i++)
		{
			this._vars[i] = 0;
		}

		this._vars[0x54] = 0x81;
	},

	_rotateVectors: function()
	{
		for (var i=0; i<64; i++)
		{
			this._paused[i] = this._paused2[i];

			if (this._vectors2[i] != 0xffff)
			{
				if (this._vectors2[i] == 0xfffe)
				{
					this._vectors[i] = 0xffff;
				}
				else
				{
					this._vectors[i] = this._vectors2[i];
				}

				this._vectors2[i] = 0xffff;
			}
		}
	},

	gameTick: function()
	{
		if (this._end == false)
		{
			this._frameCounter++;

			this.clearLog();
			this.log("tick (pages=" + this._currentPage1 + ", " + this._currentPage2 + ", " + this._currentPage3 + ")");

			var start = (new Date).getTime();
			this._updateKeyboard();
			this._rotateVectors();
			this.executeScripts();
			var diff = (new Date).getTime() - start;
			var fps = 0;
			if (diff > 0)
			{
				fps = Math.floor(1000.0 / diff);
			}

			document.getElementById("framenumber").innerHTML = this._frameCounter + " (" + fps + " fps)";
		}
	},

	timerTick: function()
	{
		if (this._useTimer)
		{
			if (this._stopAtFrame > 0)
			{
				this._stopAtFrame--;
				if (this._stopAtFrame == 0)
				{
					this._end = true;
				}
			}

			this.gameTick();
		}
	},

	_initScreens: function()
	{
		for (var i=0; i<=4; i++)
		{
			this._fillScreenRGB(i, "rgb(0, 0, 0)");
		}

		this._currentPage3 = 1;
		this._currentPage2 = 2;
		this._currentPage1 = this._currentPage2;
	},

	_updateKeyboard: function()
	{
		var lr = 0;
		var m = 0;
		var ud = 0;

		if (this._keyMask & this.DIR_RIGHT)
		{
			lr = 1;
			m |= 1;
		}

		if (this._keyMask & this.DIR_LEFT)
		{
			lr = -1;
			m |= 2;
		}

		if (this._keyMask & this.DIR_DOWN)
		{
			ud = 1;
			m |= 4;
		}

		if (this._keyMask & this.DIR_UP)
		{       
			ud = -1;
			m |= 8;
		}

		this._vars[0xe3] = -1;
	//	_scriptVars[VAR_HERO_POS_JUMP_DOWN] = ud;
		this._vars[0xfc] = lr;
		this._vars[0xfd] = m;

		var button = 0;
		if (this._button)
		{
			button = 1;
			m |= 0x80;
		}

		this._vars[0xfa] = button;
		this._vars[0xfe] = m;
	},

	onKeydown: function(e)
	{
		var handled = false;

		switch(e.keyCode)
		{
			case 37:
			// left
			this._keyMask |= this.DIR_LEFT;
			handled = true;
			break;

			case 38:
			// up
			this._keyMask |= this.DIR_UP;
			handled = true;
			break;

			case 39:
			// right
			this._keyMask |= this.DIR_RIGHT;
			handled = true;
			break;

			case 40:
			// down                  
			this._keyMask |= this.DIR_DOWN;
			handled = true;
			break;

			case 65:
			// A
			handled = true;
			this._button = 1;
			break;
		}

		if (handled && e.preventDefault)
		{
			e.preventDefault();
		}
	},

	onKeyup: function(e)
	{
		var handled = false;

		switch(e.keyCode)
		{
			case 37:
			// left
			this._keyMask &= ~this.DIR_LEFT;
			handled = true;
			break;

			case 38:
			// up
			this._keyMask &= ~this.DIR_UP;
			handled = true;
			break;

			case 39:
			// right
			this._keyMask &= ~this.DIR_RIGHT;
			handled = true;
			break;

			case 40:
			// down                  
			this._keyMask &= ~this.DIR_DOWN;
			handled = true;
			break;

			case 65:
			// A
			this._button = 0;
			handled = true;
			break;
		}

		if (handled && e.preventDefault)
		{
			e.preventDefault();
		}
	},

	observe: function(element, name, f)
	{
		if (element.addEventListener)
		{
			element.addEventListener(name, f, false);
		} 
		else 
		{
			element.attachEvent("on" + name, f);
		}
	},

	init: function(parent)
	{
		var viewport = document.createElement("div");
		viewport.setStyle({width: "640px", height: "400px", overflow: "hidden"});
		var canvas = document.createElement("canvas");
		canvas.setAttribute('width', 640);
		canvas.setAttribute('height', 400*4);
		canvas.setStyle({position: "relative", top: "0px", left: "0px"});
		viewport.appendChild(canvas);

		document.getElementById(parent).appendChild(viewport);

		this._canvas = canvas;
		this._ctx = canvas.getContext("2d");

		var that = this;
		this.observe(document, "keydown", function(e) { that.onKeydown(e); });
		this.observe(document, "keyup", function(e) { that.onKeyup(e); });

		this._preloadScripts();
		this._initScripts();
		this._initScreens();

		this._useTimer = false;
		setInterval(function() { that.timerTick() }, 1000/12);
	},

	pause: function()
	{
		this._useTimer = false;
	},

	run: function()
	{
		this._useTimer = true;
	}
}
