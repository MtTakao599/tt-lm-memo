declare module 'pdf-fontkit' {
  const fontkit: {
    create: (
      data: Uint8Array | ArrayBuffer,
      postscriptName?: string,
    ) => unknown
  }
  export default fontkit
}
