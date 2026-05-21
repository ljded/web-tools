import JSEncrypt from 'jsencrypt'

self.onmessage = () => {
  const encrypt = new JSEncrypt({ default_key_size: '2048' })
  const publicKey = encrypt.getPublicKey()
  const privateKey = encrypt.getPrivateKey()
  self.postMessage({ publicKey, privateKey })
}
