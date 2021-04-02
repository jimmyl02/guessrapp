declare module 'react-audio-spectrum' {
    interface MeterColor {
      stop: number
      color: string
    }
    export interface AudioSpectrumProps {
      id?: string // canvas id number/string a random string false
      width?: number //      canvas width      number      300      false
      height?: number //     canvas height      number      200      false
      audioId?: number | string //      id of the target audio element      number/string      -      true
      capColor?: string //      color of caps      string      #FFF      false
      capHeight?: number //      height of caps      string      2      false
      meterWidth?: number //      width of meters      number      2      false
      meterColor?: string | MeterColor[] // color of meters string/array [{stop: 0, color: '#f00'},{stop: 0.5, color: '#0CD7FD'},{stop: 1, color: 'red'}] false
      meterCount?: number
      gap?: number // gap between meters number 10 false
      audioEle?: HTMLAudioElement
    }
    declare class AudioSpectrum extends React.Component<
      AudioSpectrumProps,
      any
    > {}
    export default AudioSpectrum
  }