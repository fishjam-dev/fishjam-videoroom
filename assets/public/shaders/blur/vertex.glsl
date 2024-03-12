attribute vec4 a_Position;
varying vec2 v_pos;

void main() {
  gl_Position = a_Position;
  v_pos = (a_Position.xy + 1.0) / 2.0;
}