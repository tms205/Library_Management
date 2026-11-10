// One cube mesh is reused for the covers, spines and page blocks.
const vertexSource = `
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  uniform mat4 model;
  uniform mat4 viewProjection;
  varying vec3 worldNormal;
  varying vec3 worldPosition;
  varying vec2 textureUv;
  void main() {
    vec4 world = model * vec4(position, 1.0);
    worldPosition = world.xyz;
    worldNormal = normalize(mat3(model) * normal);
    textureUv = uv;
    gl_Position = viewProjection * world;
  }
`;
const fragmentSource = `
  precision mediump float;
  uniform vec3 tint;
  uniform vec3 cameraPosition;
  uniform sampler2D art;
  uniform int material;
  varying vec3 worldNormal;
  varying vec3 worldPosition;
  varying vec2 textureUv;
  void main() {
    if (material == 3) {
      vec2 ground = (textureUv - 0.5) * vec2(2.0, 2.0);
      float shadow = exp(-5.0 * dot(ground, ground));
      gl_FragColor = vec4(0.005, 0.025, 0.028, shadow * 0.66);
      return;
    }
    vec3 base = material == 1 ? texture2D(art, textureUv).rgb : tint;
    if (material == 2) {
      float line = smoothstep(0.66, 0.98, fract(worldPosition.z * 110.0));
      base *= 1.0 - line * 0.17;
    }
    vec3 n = normalize(worldNormal);
    vec3 key = normalize(vec3(-0.56, 0.81, 0.63));
    vec3 fill = normalize(vec3(0.58, 0.25, -0.83));
    float diffuse = max(dot(n, key), 0.0);
    float rim = max(dot(n, fill), 0.0);
    vec3 eye = normalize(cameraPosition - worldPosition);
    float sheen = pow(max(dot(n, normalize(eye + key)), 0.0), 20.0);
    vec3 shaded = base * (0.56 + diffuse * 0.54) + rim * vec3(0.045, 0.11, 0.10) + sheen * 0.07;
    gl_FragColor = vec4(shaded, 1.0);
  }
`;

function matrixMultiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1]
        + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
}
const transform = (x, y, z, w = 1, h = 1, d = 1) => new Float32Array([
  w, 0, 0, 0, 0, h, 0, 0, 0, 0, d, 0, x, y, z, 1,
]);
const rotateX = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
};
const rotateY = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};
const rotateZ = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
};
function perspective(aspect) {
  const f = 1 / Math.tan(Math.PI / 9);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, -1.01, -1, 0, 0, -0.2, 0]);
}
function cubeVertices() {
  const faces = [
    [[0, 0, 1], [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],
    [[0, 0,-1], [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],
    [[-1,0, 0], [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],
    [[1, 0, 0], [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],
    [[0, 1, 0], [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],
    [[0,-1, 0], [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]],
  ];
  const uv = [[0,0],[1,0],[1,1],[0,1]];
  return new Float32Array(faces.flatMap(([n, points]) => [0,1,2,0,2,3].flatMap((i) => [
    ...points[i].map((v) => v * 0.5), ...n, ...uv[i],
  ])));
}

function createProgram(gl) {
  const shaders = [];
  const program = gl.createProgram();
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Không thể biên dịch cảnh 3D.');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Không thể liên kết cảnh 3D.');
    return program;
  } catch (error) {
    gl.deleteProgram(program);
    throw error;
  } finally {
    shaders.forEach((shader) => gl.deleteShader(shader));
  }
}

function coverTexture(gl, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.scale(512 / 384, 1);
  const { base, ink, line, title, label } = palette;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 384, 512);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.strokeRect(25, 24, 334, 464);
  ctx.strokeRect(30, 29, 324, 454);
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.ellipse(205, 258, 110, 147, -0.26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(205, 258, 128, 157, 0.39, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.font = '600 12px sans-serif';
  ctx.fillText(label, 47, 61);
  ctx.font = '500 55px Georgia, serif';
  title.forEach((word, index) => ctx.fillText(word, 46, 218 + index * 66));
  ctx.font = '12px sans-serif';
  ctx.fillText('A U R A   L I B R A R Y', 47, 457);
  ctx.fillRect(47, 410, 44, 2);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

const palettes = [
  { base:'#1e5c55', ink:'#f2e0ae', line:'#75a59a', title:['Thư viện','số','3D.'], label:'LIBRARY 3D' },
  { base:'#dfc487', ink:'#183b36', line:'#ac8c4c', title:['Sách','số','điện tử.'], label:'DIGITAL CATALOG' },
];

export function createBookScene(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true, powerPreference: 'low-power' });
  if (!gl) return null;
  const program = createProgram(gl);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeVertices(), gl.STATIC_DRAW);
  gl.useProgram(program);
  for (const [name, count, offset] of [['position',3,0],['normal',3,12],['uv',2,24]]) {
    const attrib = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(attrib);
    gl.vertexAttribPointer(attrib, count, gl.FLOAT, false, 32, offset);
  }
  const uniforms = Object.fromEntries(['model','viewProjection','tint','cameraPosition','material','art']
    .map((name) => [name, gl.getUniformLocation(program, name)]));
  const textures = palettes.map((palette) => coverTexture(gl, palette));
  gl.uniform1i(uniforms.art, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const left = matrixMultiply(transform(-0.83, -0.05, -0.26), matrixMultiply(rotateY(0.48), rotateZ(0.13)));
  const right = matrixMultiply(transform(0.77, -0.07, 0.40), matrixMultiply(rotateY(-0.40), rotateZ(-0.13)));
  function drawBox(model, tint, kind = 0, texture) {
    gl.uniformMatrix4fv(uniforms.model, false, model);
    gl.uniform3fv(uniforms.tint, tint);
    if (texture) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.material, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.uniform1i(uniforms.material, kind);
      gl.drawArrays(gl.TRIANGLES, 6, 30);
    } else {
      gl.uniform1i(uniforms.material, kind);
      gl.drawArrays(gl.TRIANGLES, 0, kind === 3 ? 6 : 36);
    }
  }
  function drawBook(root, w, h, d, color, texture) {
    const part = (x, y, z, width, height, depth, tint, kind, art) =>
      drawBox(matrixMultiply(root, transform(x, y, z, width, height, depth)), tint, kind, art);
    part(0.02, 0, 0, w - 0.12, h - 0.11, d, [0.88, 0.83, 0.71], 2);
    part(0, 0, -d / 2, w, h, 0.057, color);
    part(0, 0, d / 2, w, h, 0.063, color, 0, texture);
    part(-w / 2 + 0.032, 0, 0, 0.064, h, d + 0.059, color);
    for (const y of [-h * 0.37, h * 0.37]) part(-w / 2, y, 0, 0.018, 0.024, d + 0.058, [0.64, 0.55, 0.34]);
  }
  return {
    draw(yaw, pitch, zoom) {
      if (gl.isContextLost()) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(800000 / (width * height)));
      const pixelsWide = Math.max(1, Math.round(width * ratio));
      const pixelsHigh = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
        canvas.width = pixelsWide;
        canvas.height = pixelsHigh;
      }
      const aspect = width / height;
      const distance = (5.2 + Math.max(0, 1.15 / aspect - 1) * 1.6) / zoom;
      const view = matrixMultiply(transform(0, 0, -distance), matrixMultiply(rotateX(pitch), rotateY(yaw)));
      gl.viewport(0, 0, pixelsWide, pixelsHigh);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(uniforms.viewProjection, false, matrixMultiply(perspective(aspect), view));
      gl.uniform3f(uniforms.cameraPosition, -Math.sin(yaw) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * distance);
      gl.depthMask(false);
      drawBox(matrixMultiply(transform(0, -1.42, 0.20), matrixMultiply(rotateX(-Math.PI / 2), transform(0, 0, 0, 6, 4.4, 0.001))), [0, 0, 0], 3);
      gl.depthMask(true);
      drawBook(left, 1.52, 2.47, 0.34, [0.12, 0.36, 0.32], textures[0]);
      drawBook(right, 1.42, 2.29, 0.27, [0.87, 0.76, 0.52], textures[1]);
    },
    dispose() {
      textures.forEach((texture) => gl.deleteTexture(texture));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
