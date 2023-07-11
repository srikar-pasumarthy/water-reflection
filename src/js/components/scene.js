import {
  Color,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  SphereGeometry,
  BufferGeometry,
  BufferAttribute,
  MeshBasicMaterial,
  Mesh,
  DirectionalLight,
  AmbientLight,
  CircleGeometry,
  RepeatWrapping,
  PointsMaterial,
  Points,
  ImageUtils,
  PlaneGeometry,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import Stats from 'stats-js'
import LoaderManager from '@/js/managers/LoaderManager'
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
      {
        name: 'picofme',
        texture: './img/picofme.jpg'
      }
    ]

    await LoaderManager.load(assets)

    this.setStats()
    this.setScene()
    this.setRender()
    this.setCamera()
    this.setControls()

    this.setText()
    this.setLights()
    this.setReflector()
    this.setParticles()
    this.setImage()

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
    this.camera.position.y = 2.5
    this.camera.position.x = 1
    this.camera.position.z = 6

    this.scene.add(this.camera)
  }

  /**
   * Threejs controls to have controls on our scene
   * https://threejs.org/docs/?q=orbi#examples/en/controls/OrbitControls
   */
  setControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI / 2.05
    this.controls.maxAzimuthAngle = Math.PI / 2
    this.controls.minAzimuthAngle = -Math.PI / 2
    this.controls.maxDistance = 25
    this.controls.minDistance = 2
    this.controls.enablePan = false
    this.controls.update()
  }


  /**
   * Add some Text to the scene
   */
  setText() {
    const fontLoader = new FontLoader()

    fontLoader.load(
        '/fonts/helvetiker_regular.typeface.json',
        (font) =>
        {
          const textGeometry = new TextGeometry(
            'Srikar Pasumarthy',
            {
                font: font,
                size: 0.5,
                height: 0.2,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelOffset: 0,
                bevelSegments: 5
            }
          )
          const textMaterial = new MeshBasicMaterial()
          const text = new Mesh(textGeometry, textMaterial)
          this.scene.add(text)
          textGeometry.center()
          textGeometry.translate(0, textGeometry.boundingBox.max.y, 0)
        }
    )
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
   * Adding an image.
   */
  setImage() {
    const img = new MeshBasicMaterial({ 
      map: LoaderManager.assets['picofme'].texture
    });
    img.map.needsUpdate = true; //ADDED

    // plane
    const plane = new Mesh(new PlaneGeometry(6.45/3, 8.6/3),img);
    plane.overdraw = true;
    plane.translateY(1.5)
    plane.translateZ(-1)
    this.scene.add(plane);
  }

  /**
   * Build stats to display fps
   */
  setStats() {
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.dom)
  }

  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.draw(0)
  }

  /**
   * Adding Particles
   */
  setParticles() {
    const particlesGeometry = new BufferGeometry()
    const count = 5000

    const positions = new Float32Array(count * 3) // Multiply by 3 because each position is composed of 3 values (x, y, z)

    for(let i = 0; i < count; i+=3) // Multiply by 3 for same reason
    {
        const x = (Math.random() - 0.5) * 100
        const z = (Math.random() - 0.5) * 100
        positions[i] = (Math.random() - 0.5) * 100 // Math.random() - 0.5 to have a random value between -0.5 and +0.5
        positions[i+1] = (Math.random() + 1) * 6 - (x * 0.1)
        positions[i+2] = z
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
