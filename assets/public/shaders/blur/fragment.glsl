precision mediump float;
varying vec2 v_pos;

uniform sampler2D texture;
uniform sampler2D resizedTexture;
uniform sampler2D confidenceTexture;
uniform vec2 u_size;

const float gamma=1.8;

const int CONV_SIDE=5;
const float BLUR_RADIUS=float(CONV_SIDE);

vec4 blur(sampler2D texture, sampler2D confidence, vec2 size, vec2 un) {
    float n = 0.0;
    vec3 res = vec3(0);
    vec2 delta = 1.0  /size;
    vec2 confidence_delta = 1.0 / size * 2.;

    for(int x = -CONV_SIDE; x <= CONV_SIDE; x++){
        for(int y = -CONV_SIDE; y <= CONV_SIDE; y++){
        	vec2 u_ = un + delta * vec2(x,y);
        	vec2 cu_=un + confidence_delta * vec2(x,y);
            float c = 1.0 - texture2D(confidence, cu_).x;

            if (distance(u_, un) <= BLUR_RADIUS) {
                res += texture2D(texture, u_).rgb * c;
                n += c;
            }
        }
    }

    if (n > 1.0) {
      res /= n;
    }

    return vec4(res, 1.0);
}

void main() {
  vec4 blurredValue = blur(resizedTexture, confidenceTexture, vec2(1280, 720) / 4., v_pos);
  vec4 sharpValue = texture2D(texture, v_pos);
  
  vec4 filtered_confidence = smoothstep(0.1, 0.8, texture2D(confidenceTexture, v_pos));
  
  if (filtered_confidence.x < 0.5) {
    gl_FragColor = blurredValue;
  } else {
    gl_FragColor = mix(blurredValue, sharpValue, filtered_confidence.x);
  }
}


