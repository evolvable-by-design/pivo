import typescript from 'rollup-plugin-typescript2'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'es'
    }
  ],
  external: ['react', 'axios', 'openapi-types'],
  plugins: [
    json(),
    typescript({ exclude: '/test/**', useTsconfigDeclarationDir: true }),
    commonjs(),
    nodeResolve({ browser: true, preferBuiltins: true })
  ]
}
