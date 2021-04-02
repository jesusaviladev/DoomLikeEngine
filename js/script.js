console.log('DoomZombies v1.0.0 by Jesus')
//Variables globales
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
let fps = 50
const FOV = 60
const midFOV = Math.floor(FOV/2)
//Dimensiones del canvas
const cWidth = canvas.width
const cHeight = canvas.height
//matriz de nivel
const level1 = [
	[1,1,1,4,3,2,1,1,1,1],
	[1,0,0,0,0,0,1,1,0,4],
	[1,0,0,0,0,0,0,1,0,1],
	[6,0,0,0,0,0,1,1,0,2],
	[1,2,2,4,3,0,0,0,0,3],
	[1,0,0,0,0,1,5,7,0,2],
	[3,0,0,0,0,0,0,1,0,1],
	[1,0,1,8,0,0,0,1,0,7],
	[2,0,0,1,0,0,0,0,0,1],
	[1,2,5,8,1,1,4,1,1,1],
]
let stage
let player
let tiles
//-------------------------------------------------------------------
//definir clases para objetos del juego
//clase del nivel
class World{
	constructor(canvas, ctx, levelArray){
		this.canvas = canvas
		this.ctx = ctx 
		this.levelArray = levelArray
		//dimensiones de la matriz
		this.heightArr = levelArray.length
		this.widthArr = levelArray[0].length
		//dimensiones del canvas (especificado arriba)
		this.cWidth = canvas.width
		this.cHeight = canvas.height
		//dimensiones de cada pared
		this.tileWidth = Math.floor(this.cWidth/this.widthArr)
		this.tileHeight = Math.floor(this.cHeight/this.heightArr)

	}
	//funcion para dibujar el mapa
	draw(){
		
		let color

		for(let y = 0; y <  this.heightArr; y++){

			for (let x = 0; x < this.widthArr; x++){

				if(this.levelArray[y][x] == 1){
					color = '#000'
				} else{
					color = '#666'
				}

				this.ctx.fillStyle = color
				this.ctx.fillRect(x*this.tileWidth, y*this.tileHeight, this.tileWidth, this.tileHeight)
			}

		}

	}

	getTile(x,y){
		let casillaX = Math.floor(x/this.tileWidth)
		let casillaY = Math.floor(y/this.tileHeight)

		return this.levelArray[casillaY][casillaX]
	}

	drawBackground(){
		//sky
		this.ctx.fillStyle = 'navy'
		this.ctx.fillRect(0, 0, this.cWidth, this.cHeight/2)
		//ground
		this.ctx.fillStyle = '#333'
		this.ctx.fillRect(0, this.cHeight/2, this.cWidth, this.cHeight/2)

	}

	collisions(x,y){
		let collision = false
			if(this.levelArray[y][x]!=0){
				collision = true
			}

			return collision
		}
}

//clase del jugador
class Player{
	constructor(ctx, stage, x, y){
		this.ctx = ctx
		//mapa 
		this.stage = stage
		//posicion del jugador en el mapa
		this.x = x
		this.y = y
		//variable para indicar si el jugador esta avanzando
		this.move = 0 // valores: 0 = parado,  1 = adelante, -1 = atras
		//variable de giro del jugador
		this.turn = 0 //  1 = giro derecha, -1 = giro izquierda
		//angulo de rotacion
		this.turnAngle = 0
		//velocidad de movimiento
		this.moveSpeed = 3 //pixels
		//velocidad de rotacion
		this.turnSpeed = 3 * (Math.PI/180) //GRADOS EN CONVERSION A RADIANES

		// RAYOS
		this.rayNum = this.stage.cWidth
		this.rays = [] 

		// calcular angulo de los rayos
		let angleIncrement = conversionToRad(FOV/this.rayNum)
		let initialAngle = conversionToRad(this.turnAngle - midFOV)

		let rayAngle = initialAngle

		//crear los rayos

		for (let i = 0; i < this.rayNum; i++){
			this.rays[i] = new Ray(this.ctx, this.stage, this.x, this.y, this.turnAngle, rayAngle, i)
			rayAngle += angleIncrement
		}
		
	}
	//funcion para dibujar al jugador por pantalla
	drawPlayer(){
		this.moving()
		for(let i = 0; i < this.rayNum; i++){
			this.rays[i].render()
		}

		// this.ctx.fillStyle = 'white'
		// this.ctx.fillRect(this.x-5, this.y-5, 10, 10)

	}

	//funcion para capturar el estado del movimiento
	movement(type){
		if(type == 'up'){
			this.move = 1
		}

		else if(type == 'down'){
			this.move = -1
		}

		else if(type == 'left'){
			this.turn = -1
		}

		else if(type == 'right'){
			this.turn = 1
		}
	}
	//funcion para eliminar estado del movimiento
	stopMovement(type){

		if(type == 'up' || type == 'down'){
			this.move = 0
		}

		else if(type == 'left' || type =='right'){
			this.turn = 0
		}

	}

	//funcion para mover
	moving(){
		//IMPORTANTE!!!!!!!

		//avanzar
		let newX = this.x + (this.move * Math.cos(this.turnAngle) * this.moveSpeed)
		let newY = this.y + (this.move * Math.sin(this.turnAngle) * this.moveSpeed)

		if (!this.detectCollisions(newX, newY)){
			this.x = newX
			this.y = newY
		}
		

		//girar cambiar el angulo
		this.turnAngle += this.turn * this.turnSpeed
		this.turnAngle = normalizeAngle(this.turnAngle)

		//actualizar angulo del rayo

		for (let i = 0; i < this.rayNum; i++){

			this.rays[i].x = this.x
			this.rays[i].y = this.y
			this.rays[i].setAngle(this.turnAngle)
		}

	}

	//detectar colisiones
	detectCollisions(x,y){
		let collision = false
		//calcular casilla del jugador
		let casillaX = Math.floor(x/stage.tileWidth) 
		let casillaY = Math.floor(y/stage.tileHeight)

		if(stage.collisions(casillaX, casillaY)){
			collision = true
		}

		return collision	
	}	
}

//clase para el raycasting
class Ray{
	constructor(ctx, stage, x, y, playerAngle, angleIncrement, column){
		this.ctx = ctx //contexto de dibujado
		this.stage = stage //escenario
		this.x = x //posicion x del jugador
		this.y = y //posicion y del jugador 
		this.playerAngle = playerAngle //angulo de movimiento del jugador
		this.angleIncrement = angleIncrement//incremento del angulo del jugador
		this.column = column
		//distancia del rayo al punto de choque
		this.distance = 0

		this.wallHitX = 0
		this.wallHitY = 0

		this.wallHitXHorizontal = 0 
		this.wallHitYHorizontal = 0

		this.wallHitXVertical = 0
		this.wallHitYVertical = 0
		//textura de cada pixel
		this.pixelTexture = 0
		//id textura
		this.textureId = 0
	}

	setAngle(angle){
		this.angle = angle
		this.playerAngle = normalizeAngle(angle + this.angleIncrement)

	}

	cast(){

		//IMPORTANTISIMO FUNCION MAESTRA!!!!!!!!!!!!!!!
		this.xIntersection = 0
		this.yIntersection = 0
		//calcular intersecciones del rayo al colisionar con un muro

		this.xStep = 0
		this.yStep = 0
		//pasos de cada colision en las casillas

		//determinar a donde mira el rayo
		this.down = false
		this.left = false

		if(this.playerAngle < Math.PI){
			this.down = true
		}

		if(this.playerAngle > Math.PI/2 && this.playerAngle < 3 * Math.PI/2){
			this.left = true
		}

		//DETERMINAR COLISION HORIZONTAL--------------------------------------

		let horizontalHit = false 
		//buscar primera interseccion de la Y 
		this.yIntersection = Math.floor(this.y/this.stage.tileHeight) * this.stage.tileHeight
		//si apunta hacia abajo incrementar una baldosa
		if(this.down){
			this.yIntersection += this.stage.tileHeight
		}
		//calcular adyacente
		let adjacent = (this.yIntersection - this.y) / Math.tan(this.playerAngle)//cateto adyacente 
		//interseccion de la X
		this.xIntersection = this.x + adjacent

		//calcular distancia de cada paso
		this.yStep = this.stage.tileHeight
		this.xStep = this.yStep/Math.tan(this.playerAngle)
		//si vamos hacia arriba invertir la y
		if(!this.down){
			this.yStep = this.yStep * (-1)
		}

		//coherencia de los pasos en X (izq negativo, der positivo)
		if((this.left && this.xStep > 0) || (!this.left && this.xStep < 0)){

			this.xStep = this.xStep * (-1)
		}

		let nextHorizontalX = this.xIntersection
		let nextHorizontalY = this.yIntersection

		//si apunto hacia arriba resto un pixel para forzar la colision
		if(!this.down){
			nextHorizontalY--
		}
		//bucle para buscar punto de colision
		while(!horizontalHit){
			//calcular casilla actual
			let casillaX = Math.floor(nextHorizontalX/this.stage.tileWidth)
			let casillaY = Math.floor(nextHorizontalY/this.stage.tileHeight)

			if(this.stage.collisions(casillaX, casillaY)){
				horizontalHit = true
				this.wallHitXHorizontal = nextHorizontalX
				this.wallHitYHorizontal = nextHorizontalY
			} 

			else{
				nextHorizontalX += this.xStep
				nextHorizontalY += this.yStep
			}
		}

		//DETERMINAR COLISION VERTICAL --------------------------------------
		let verticalHit = false 

		//buscar primera interseccion
		this.xIntersection = Math.floor(this.x / this.stage.tileWidth) * this.stage.tileWidth
		//si apunta a la derecha sumamos una baldosa
		if(!this.left){
			this.xIntersection += this.stage.tileWidth
		}

		//calcular cateto opuesto
		let opposite = (this.xIntersection - this.x) * Math.tan(this.playerAngle)
		this.yIntersection = this.y + opposite
		//calcular distancia de cada paso
		this.xStep = this.stage.tileWidth
		this.yStep = this.stage.tileWidth * Math.tan(this.playerAngle)
		//si va a la izquierda invertir 
		if(this.left){
			this.xStep = this.xStep * (-1)
		}

		//coherencia de los pasos 
		if((!this.down && this.yStep > 0) || (this.down && this.yStep < 0)){
			this.yStep = this.yStep * (-1)
		}

		let nextVerticalX = this.xIntersection
		let nextVerticalY = this.yIntersection

		//si vamos a la izq resto un pixel

		if(this.left){
			nextVerticalX--
		}

		//bucle para detectar colision

		while(!verticalHit && (nextVerticalX >= 0 && nextVerticalY >= 0 && nextVerticalX < cWidth && nextVerticalY < cHeight)){
			//obtener casilla
			let casillaX = Math.floor(nextVerticalX/this.stage.tileWidth)
			let casillaY = Math.floor(nextVerticalY/this.stage.tileHeight)

			if (this.stage.collisions(casillaX, casillaY)){
				verticalHit = true
				this.wallHitXVertical = nextVerticalX
				this.wallHitYVertical = nextVerticalY
			} else {
				nextVerticalX += this.xStep
				nextVerticalY += this.yStep
			}
		}

		//-------------Determinar cercania de colision----------------------------------

		let horizontalDistance = 9999
		let verticalDistance = 9999

		if(horizontalHit){
			horizontalDistance = distanceBetweenTwo(this.x, this.y, this.wallHitXHorizontal, this.wallHitYHorizontal)
		}

		if(verticalHit){
			verticalDistance = distanceBetweenTwo(this.x, this.y, this.wallHitXVertical, this.wallHitYVertical)
		}

		if(horizontalDistance < verticalDistance){
			this.wallHitX = this.wallHitXHorizontal
			this.wallHitY = this.wallHitYHorizontal
			this.distance = horizontalDistance

			let casilla = Math.floor(this.wallHitX/this.stage.tileWidth)
			//calcular la textura de cada pixel
			this.pixelTexture = this.wallHitX - (casilla * this.stage.tileWidth);
		}

		else{
			this.wallHitX = this.wallHitXVertical
			this.wallHitY = this.wallHitYVertical
			this.distance = verticalDistance

			let casilla = Math.floor(this.wallHitY/this.stage.tileHeight)
			//calcular la textura de cada pixel
			this.pixelTexture = this.wallHitY - (casilla * this.stage.tileHeight);
		}
		//correcion ojo de pez

		this.distance = this.distance * Math.cos(this.playerAngle - this.angle) 
		this.textureId = this.stage.getTile(this.wallHitX,this.wallHitY)

	}

	render(){
		//renderizar mundo
		this.cast()
		let distanciaPlanoProyeccion = (this.stage.cWidth/2)/Math.tan(midFOV)
		let tileHeight = this.stage.cHeight
		let wallHeight = (tileHeight / this.distance) * distanciaPlanoProyeccion

		//calcular donde empieza y acaba la linea 
		let y0 = this.stage.cHeight/2 - Math.floor(wallHeight/2)
		let y1 = y0 + wallHeight
		let x = this.column
		//dibujar

		// this.ctx.beginPath()
		// this.ctx.moveTo(x, y0)
		// this.ctx.lineTo(x,y1)
		// this.ctx.strokeStyle = '#777777'
		// this.ctx.stroke()

		let textureHeight = 64

		let imageHeight = y0-y1
		this.ctx.imageSmoothingEnabled = false
		this.ctx.drawImage(tiles,this.pixelTexture,(this.textureId - 1 )*textureHeight,1,textureHeight,x,y1,1,imageHeight)

	}

	drawRay(){
		this.cast()

		let xDestino = this.wallHitX
		let yDestino = this.wallHitY

		this.ctx.beginPath()
		this.ctx.moveTo(this.x, this.y)
		this.ctx.lineTo(xDestino, yDestino)
		this.ctx.strokeStyle = 'red'
		this.ctx.stroke()
	}
}

//-------------------------------------------------------------------//
function initGame(){
	//iniciar objetos
	stage = new World(canvas,ctx,level1)
	player = new Player(ctx, stage, 100, 100)
	//cargar texturas
	tiles = new Image()
	tiles.src = 'assets/textures/walls2.png'

	//inicializador del bucle
	setInterval(main, 1000/fps)
}

function main(){
	//bucle principal del juego
	eraseCanvas()
	stage.drawBackground()
	player.drawPlayer()
	
}

function eraseCanvas(){
	canvas.width = canvas.width
	canvas.height = canvas.height
}
//normalizar angulo
function normalizeAngle(angle){

	angle = angle%(2*Math.PI)

	if(angle < 0){
		angle = angle + (2*Math.PI)
	}

	return angle
}
// calcular distancia entre dos puntos
function distanceBetweenTwo(x1,y1,x2,y2){
	return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1))
}
//conversor a radianes
function conversionToRad(angle){
	angle = angle * (Math.PI / 180)
	return angle
}
window.addEventListener('load', initGame)

//EVENTOS DE TECLAS PARA EL CONTROL DEL JUGADOR
window.addEventListener('keydown', (e)=>{
	// e.preventDefault()
	const tecla = e.keyCode
	switch(tecla){
		case 38:
		player.movement('up')
		break;
		case 87:
		player.movement('up')
		break;
		case 40:
		player.movement('down')
		break;
		case 83:
		player.movement('down')
		break;
		case 37:
		player.movement('left')
		break;
		case 39:
		player.movement('right')
		break;
	}
})

window.addEventListener('keyup', (e)=>{
	// e.preventDefault()
	const tecla = e.keyCode
	switch(tecla){
		case 38:
		player.stopMovement('up')
		break;
		case 87:
		player.stopMovement('up')
		break;
		case 40:
		player.stopMovement('down')
		break;
		case 83:
		player.stopMovement('down')
		break;
		case 37:
		player.stopMovement('left')
		break;
		case 39:
		player.stopMovement('right')
		break;
	}

})