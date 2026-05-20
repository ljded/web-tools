/// <reference types="vite/client" />

declare module 'sm-crypto' {
  export function sm3(input: string): string
  export namespace sm2 {
    function generateKeyPairHex(): { publicKey: string; privateKey: string }
    function doEncrypt(msg: string, publicKey: string, cipherMode: number): string
    function doDecrypt(encryptData: string, privateKey: string, cipherMode: number): string
    function doSignature(msg: string, privateKey: string): string
    function doVerifySignature(msg: string, sig: string, publicKey: string): boolean
  }
  export namespace sm4 {
    function encrypt(plainText: string, key: string): string
    function decrypt(cipherText: string, key: string): string
  }
}

declare module 'gbk.js' {
  const gbk: {
    encode(str: string): number[]
    decode(arr: number[]): string
    URI: {
      encodeURI(str: string): string
      decodeURI(str: string): string
      encodeURIComponent(str: string): string
      decodeURIComponent(str: string): string
    }
  }
  export default gbk
}
