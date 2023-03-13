import { /* inject, */ BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ConfiguracionSeguridad} from '../config/seguridad.config';
import {Credenciales, FactorDeAutenticacionPorCodigo, Usuario} from '../models';
import {LoginRepository, UsuarioRepository} from '../repositories';
const generator = require('generate-password');
const MD5 = require('crypto-js/md5');
const jwt = require('jsonwebtoken');

@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadUsuarioService {
  constructor(
    @repository(UsuarioRepository)
    public repositorioUsuario: UsuarioRepository,
    @repository(LoginRepository)
    public repositorioLogin: LoginRepository
  ) {}

  /**
   * crear una clave aleatoria
   * @returns cadena aleatoria de n caracteres
   */
  crearTextoAleatorio(n:number): string{
    const clave = generator.generate({
      length: n,
      numbers: true
    });
    return clave;
  }

  /**
   * Cifrar una cadena con el método MD5
   * @param cadena texto a cifrar
   * @returns cadena cifraca con MD5
   */
  cifrarTexto(cadena:string): string{
    const cadenaCifrada = MD5(cadena).toString();
    return cadenaCifrada;
  }

  /**
   * Se busca un usuario por sus credenciales de acceso
   * @param credenciales credenciales del usuario
   * @returns usuario encontrado o null
   */
  async identificarUsuario(credenciales: Credenciales): Promise<Usuario | null> {
    const usuario = await this.repositorioUsuario.findOne({
      where:{
        correo: credenciales.correo,
        clave: credenciales.clave
      }
    });
    return usuario as Usuario;
  }


  async validarCodigo2fa(credenciales2fa: FactorDeAutenticacionPorCodigo): Promise<Usuario | null>{
    const login = await this.repositorioLogin.findOne({
      where:{
        usuarioId: credenciales2fa.usuarioId,
        codigo2fa: credenciales2fa.codigo2fa,
        estadoCodigo2fa: false
      }
    });
    if(login){
      const usuario = await this.repositorioUsuario.findById(credenciales2fa.usuarioId);
      return usuario;
    }
    return null;
  }

  /**
   * Generación del JWT
   * @param usuario información del usuario
   * @returns token
   */
  crearToken(usuario: Usuario): string {
    const datos = {
      name: `${usuario.primerNombre} ${usuario.segundoNombre} ${usuario.primerApellido} ${usuario.segundoApellido}`,
      role: usuario.rolId,
      email: usuario.correo
    };
    const token = jwt.sign(datos, ConfiguracionSeguridad.claveJWT);
    return token;
  }

  /**
   * Valida y obtiene el rol de un token
   * @param tk el token
   * @returns el _id del rol
   */
  obtenerRolDesdeToken(tk:string): string{
    let obj = jwt.verify(tk, ConfiguracionSeguridad.claveJWT);
    return obj.role;
  }
}
