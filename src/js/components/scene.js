import {
  Color,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  SphereGeometry,
  BufferGeometry,
  BufferAttribute,
  MeshStandardMaterial,
  Mesh,
  DirectionalLight,
  AmbientLight,
  CircleGeometry,
  RepeatWrapping,
  PointsMaterial,
  Points,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import Stats from 'stats-js'
import LoaderManager from '@/js/managers/LoaderManager'
import GUI from 'lil-gui'
import vertexShader from '../glsl/main.vert'
import fragmentShader from '../glsl/main.frag'

export default class MainScene {
  canvas
  renderer
  scene
  camera
  controls
  stats
  width
  height
  mesh
  guiObj = {
    y: 0,
    showTitle: true,
  }

  constructor() {
    this.canvas = document.querySelector('.scene')

    this.init()
  }

  init = async () => {
    // Preload assets before initiating the scene
    const assets = [
      {
        name: 'waterdudv',
        texture: './img/waterdudv.jpg',
      },
    ]

    await LoaderManager.load(assets)

    this.setStats()
    this.setGUI()
    this.setScene()
    this.setRender()
    this.setCamera()
    this.setControls()

    this.setSphere()
    this.setLights()
    this.setReflector()
    this.setParticles()

    this.handleResize()

    // start RAF
    this.events()
  }

  /**
   * Our Webgl renderer, an object that will draw everything in our canvas
   * https://threejs.org/docs/?q=rend#api/en/renderers/WebGLRenderer
   */
  setRender() {
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    })
  }

  /**
   * This is our scene, we'll add any object
   * https://threejs.org/docs/?q=scene#api/en/scenes/Scene
   */
  setScene() {
    this.scene = new Scene()
    this.scene.background = new Color(0x000424)
  }

  /**
   * Our Perspective camera, this is the point of view that we'll have
   * of our scene.
   * A perscpective camera is mimicing the human eyes so something far we'll
   * look smaller than something close
   * https://threejs.org/docs/?q=pers#api/en/cameras/PerspectiveCamera
   */
  setCamera() {
    const aspectRatio = this.width / this.height
    const fieldOfView = 60
    const nearPlane = 0.1
    const farPlane = 10000

    this.camera = new PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.camera.position.y = 5
    this.camera.position.x = 5
    this.camera.position.z = 5
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  /**
   * Threejs controls to have controls on our scene
   * https://threejs.org/docs/?q=orbi#examples/en/controls/OrbitControls
   */
  setControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    // this.controls.dampingFactor = 0.04
  }


  /**
   * Create a SphereGeometry
   * https://threejs.org/docs/?q=box#api/en/geometries/SphereGeometry
   * with a Basic material
   * https://threejs.org/docs/?q=mesh#api/en/materials/MeshBasicMaterial
   */
  setSphere() {
    const geometry = new SphereGeometry(1, 32, 32)
    const material = new MeshStandardMaterial({ color:0xffffff })

    this.sphereMesh = new Mesh(geometry, material)
    this.scene.add(this.sphereMesh)
  }

  setLights() {
    const directionalLight = new DirectionalLight(0xffffff, 0.5)
    directionalLight.position.x = 1
    this.scene.add(directionalLight)

    const ambientLight = new AmbientLight( 0x777777 )
    this.scene.add( ambientLight )
  }


  /**
   * Building the reflection
   */
  setReflector() {
    const geometry = new CircleGeometry(40, 64)
    const customShader = Reflector.ReflectorShader

    customShader.vertexShader = vertexShader
    customShader.fragmentShader = fragmentShader

    const dudvMap = LoaderManager.assets['waterdudv'].texture
    dudvMap.wrapS = dudvMap.wrapT = RepeatWrapping
    customShader.uniforms.tDudv = { value: dudvMap }
    customShader.uniforms.time = { value: 0 }

    this.groundMirror = new Reflector(geometry, {
      shader: customShader,
      clipBias: 0.003,
      textureWidth: window.innerWidth,
      textureHeight: window.innerHeight,
      color: 0x000000,
    })
    this.groundMirror.position.y = 0
    this.groundMirror.rotateX(-Math.PI / 2)
    this.scene.add(this.groundMirror)
  }


  /**
   * Build stats to display fps
   */
  setStats() {
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.dom)
  }

  setGUI() {
    const titleEl = document.querySelector('.main-title')

    const handleChange = () => {
      if (gui){
        this.sphereMesh.position.y = this.guiObj.y
      }
    }

    const gui = new GUI()
    gui.add(this.guiObj, 'y', -3, 3).onChange(handleChange)
  }
  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.draw(0)
  }

  setParticles() {
    const particlesGeometry = new BufferGeometry()
    const count = 5000

    const positions = new Float32Array(count * 3) // Multiply by 3 because each position is composed of 3 values (x, y, z)

    for(let i = 0; i < count; i++) // Multiply by 3 for same reason
    {
        positions[i] = (Math.random() - 0.5) * 100 // Math.random() - 0.5 to have a random value between -0.5 and +0.5
        positions[i+1] = (Math.random() + 20) * 10
        positions[i+2] = (Math.random() - 0.5) * 100
    }

    particlesGeometry.setAttribute('position', new BufferAttribute(positions, 3))

    const material = new PointsMaterial( {color: 0xffffff, size: 0.1 } )
    
    const mesh = new Points(particlesGeometry, material)

    this.scene.add(mesh)
  }

  // EVENTS

  /**
   * Request animation frame function
   * This function is called 60/time per seconds with no performance issue
   * Everything that happens in the scene is drawed here
   * @param {Number} now
   */
  draw = (time) => {
    // now: time in ms
    this.stats.begin()

    if (this.controls) this.controls.update() // for damping
    this.renderer.render(this.scene, this.camera)

    this.sphereMesh.position.y = Math.sin(time / 1000) + 3
    this.groundMirror.material.uniforms.time.value += 0.1

    this.stats.end()
    this.raf = window.requestAnimationFrame(this.draw)
  }

  /**
   * On resize, we need to adapt our camera based
   * on the new window width and height and the renderer
   */
  handleResize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Update camera
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()

    const DPR = window.devicePixelRatio ? window.devicePixelRatio : 1

    this.renderer.setPixelRatio(DPR)
    this.renderer.setSize(this.width, this.height)
  }
}
