const express = require("express");
const app = express();
const { WebhookClient } = require('dialogflow-fulfillment');
const { Pool } = require('pg');
const dotenv = require('dotenv');

const TelegramBot = require('node-telegram-bot-api');

dotenv.config();

const connectionTimeoutMillis = 40000;

const telegramToken = '6777426387:AAHvHB1oJdcMqt6hutj2D1ZqcI7y0a2dFBg';
const bot = new TelegramBot(telegramToken, { polling: false });
let validadCedula=false;
let usuario_cedula=0;
let validar_saludo=false;
let bandera=false;
let id_asignado=0;
let id_Perfil=0;
let banderaPerfil=false
let incidentesPendientes=null;
let validarPerfil=false
let validarIngresar=false


//consultar el id_Perfil

async function obtenerIdPerfilUsuario(idUsuario) {
  const query = `
    SELECT
      u.id_perfil
    FROM
      public.usuarios u
    WHERE
      u.id_usuario = $1;
  `;

  try {
    const { rows } = await pool.query(query, [idUsuario]);
    const idPerfil = rows[0]?.id_perfil;
    console.log("ID de perfil:", idPerfil);
    return idPerfil; // Devuelve el id_perfil o null si no se encuentra
  } catch (error) {
    console.error("Error al obtener el id_perfil del usuario", error);
    throw error;
  }
}

//INcindenntes pendientes de cada admin
async function obtenerIncidentesAsignadosPendientesUltimosDosDias(idUsuario) {
  const query = `
    SELECT
      i.id_incidente,
      i.incidente_nombre,
      i.incidente_descrip,
      i.fecha_incidente,
      c.nombre_colaborador AS nombre_reportador,
      CASE
        WHEN i.id_estado = 1 THEN 'Nuevo'
        WHEN i.id_estado = 2 THEN 'Pendiente'
        WHEN i.id_estado = 3 THEN 'Cerrado con éxito'
        ELSE 'Estado Desconocido'
      END AS estado_incidente
    FROM
      public.incidente i
    JOIN
      public.asignacion_user a ON i.id_asignacion_user = a.id_asignacion_user
    JOIN
      public.colaboradores c ON i.id_reportacion_user = c.id_colaborador
    WHERE
      a.id_usuario = $1
      AND i.id_estado = 2
      AND i.fecha_incidente >= CURRENT_DATE - INTERVAL '2 days'
    ORDER BY
      i.fecha_incidente DESC;
  `;

  try {
    const { rows } = await pool.query(query, [idUsuario]);
    return rows;
  } catch (error) {
    console.error("Error al obtener incidentes asignados pendientes:", error);
    throw error;
  }
}



// Crear una instancia del bot de Telegram


const pool = new Pool({
  connectionString: process.env.conexion,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: connectionTimeoutMillis,
});

/*Extraer formato de mensaje enviadas por prametros por dialogflow*/



let nombreTituloGlobal = null;
let descripcionInciGlobal = null;

async function ObtenerRespuestaTitulo_Base(agent) {
  try {
    const regex = /([\s\S]+)/;
    const match = agent.query.match(regex);

    if (match) {
      const textoCompleto = match[1].trim();
      const palabras = textoCompleto.split(' ');
      nombreTituloGlobal = palabras.shift();
      descripcionInciGlobal = textoCompleto;

      return { nombreTituloGlobal, descripcionInciGlobal };
    }

    return null;
  } catch (error) {
    console.error('Error al obtener la información del título:', error);
    return null;
  }
}


/*---------------------------------------*/


/*Funciones de consulta a la base de datos*/


function delay (ms){
  return new Promise (resolve => setTimeout(resolve,ms));
} 

async function obtenerCategorias() {
    const query = 'SELECT * FROM incidente_categoria';
    try {
      const { rows } = await pool.query(query);
      return rows; // Devolver las categorías
    } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre las categorías de incidentes", error);
      throw error;
    }
  }

  async function obtenerEstado() {
    const query = 'SELECT * FROM incidente_estado';
    try {
      const { rows } = await pool.query(query);
      return rows; // Devolver las categorías
    } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre los estados de incidentes", error);
      throw error;
    }
  }

  async function obtenerResolucion(){
    const query = 'SELECT * FROM incidente_resolucion';
    try {
      const { rows } = await pool.query(query);
      return rows; // Devolver las categorías
    } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre las prioridades de incidentes", error);
      throw error;
    }
  }

  async function obtenerImpactos(){
    const query = 'SELECT * FROM incidente_impacto';
    try {
      const { rows } = await pool.query(query);
      return rows; // Devolver las categorías
    } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre las prioridades de incidentes", error);
      throw error;
    }
  }

  async function obtenerUrgencia(){
    const query = 'SELECT * FROM incidente_urgencia';
    try {
      const { rows } = await pool.query(query);
      return rows; // Devolver las categorías
    } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre las prioridades de incidentes", error);
      throw error;
    }
  }

  async function obtenerCierre(){
    const query = 'SELECT * FROM incidente_cierre';
    try {
      const { rows } = await pool.query(query);
      return rows; // Devolver las categorías
    } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre las prioridades de incidentes", error);
      throw error;
    }
  }

  async function obtenerPrioridad(){
    const query = 'SELECT * FROM incidente_prioridad';
    try {
      const { rows } = await pool.query(query);
      return rows; // Devolver las categorías
    } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre las prioridades de incidentes", error);
      throw error;
    }
  }

  async function obtenerUsuariosDisponiblesIn() {
    const query = 'SELECT asignacion_user.*, colaboradores.nombre_colaborador FROM asignacion_user INNER JOIN usuarios ON asignacion_user.id_usuario = usuarios.id_usuario INNER JOIN colaboradores ON usuarios.id_colaborador = colaboradores.id_colaborador WHERE disponibilidad = 0';
  
    try {
      const { rows } = await pool.query(query);
      return rows;
    } catch (error) {
      console.error('Error al obtener los usuarios disponibles:', error);
      throw new Error('Lo siento, ocurrió un error al obtener los usuarios disponibles.');
    }
  }

  async function escala_niveles(){
    const query = 'SELECT * FROM incidente_escala';
    try {
      const { rows } = await pool.query(query);
      return rows; // Devolver las categorías
    } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre los niveles de incidentes", error);
      throw error;
    }

  }


async function obtenerColaboradorPorCedula(numeroCedula) {
  console.log('Cédula recibida:', numeroCedula); // Imprimir el valor de cedula para depuración
  const query = `
    SELECT 
      colaboradores.nombre_colaborador, 
      departamento.nombre_departamento AS nombre_departamento,
      subquery_usuarios.id_usuario
    FROM 
      public.colaboradores 
    INNER JOIN 
      public.departamento ON colaboradores.id_departamento = departamento.id_departamento
    LEFT JOIN (
      SELECT id_usuario, id_colaborador
      FROM public.usuarios
    ) AS subquery_usuarios ON colaboradores.id_colaborador = subquery_usuarios.id_colaborador
    WHERE 
      colaboradores.cedula = $1
  `;
  console.log('Consulta SQL:', query); // Imprimir la consulta SQL para depuración

  try {
    const { rows } = await pool.query(query, [numeroCedula]);

    if (rows.length > 0) {
      const colaborador = rows[0];
      let mensaje = `👋 ¡Hola ${colaborador.nombre_colaborador}! `;


      if (colaborador.nombre_departamento) {
        mensaje += ` eres del departamento: ${colaborador.nombre_departamento}.`;
      }

      const id_usuario = colaborador.id_usuario;

      return { mensaje, id_usuario };

    } else {
      return { exists: false }; // Devolvemos un objeto con la propiedad exists en false
    }
  } catch (error) {
    console.error('Error al ejecutar la consulta:', error);
    throw new Error('Error al obtener información del colaborador.');
  }
}


async function InsertarUsuarioRepotado(numeroCedula) {
  try {
    // Validar si el usuario existe en la tabla personas
    const usuario = await obtenerColaboradorPorCedula(numeroCedula);

    if (usuario.exists === false) {
      throw new Error('Usuario no encontrado en la base de datos.');
    }

    if (!usuario.id_usuario) {
      throw new Error('No se puede registrar un usuario sin id_usuario.');
    }

    // Verificar si ya existe un usuario reportado con la misma cédula
    const queryExist = `SELECT id_reportacion_user FROM reportacion_user WHERE id_usuario = $1`;
    const resultExist = await pool.query(queryExist, [usuario.id_usuario]);

    if (resultExist.rows.length > 0) {
      throw new Error('El usuario reportado ya existe.');
    }

    // Insertar el nuevo registro en la tabla usuarios_reportados
    const queryInsert = `
      INSERT INTO reportacion_user (id_reportacion_user, id_usuario)
      VALUES (DEFAULT, $1)
      RETURNING id_reportacion_user, id_usuario;
    `;

    const values = [usuario.id_usuario];
    const resultInsert = await pool.query(queryInsert, values);

    const idUsuarioReportado = resultInsert.rows[0].id_reportacion_user;

    return { message: 'Usuario reportado registrado correctamente.', idUsuarioReportado };
  } catch (error) {
    console.error('Error al registrar usuario reportado:', error);
    throw new Error('Error al registrar usuario reportado.');
  }
}


async function UltimoUsuarioReportadoIncidente() {
  try {
    const query = `
      SELECT u.id_usuario
      FROM Usuarios u
      INNER JOIN reportacion_user ur ON u.id_usuario = ur.id_usuario
      ORDER BY ur.id_usuario DESC
      LIMIT 1
    `;
    const { rows: results } = await pool.query(query);
    if (results.length > 0) {
      const ultimoIdUsuario = results[0].id_usuario;
      return ultimoIdUsuario;
    } else {
      throw new Error('No se encontraron usuarios reportados.');
    }
  } catch (error) {
    throw error;
  }
}

async function Base_Conocimiento(agent) {
  try {
    // Verificar si el usuario está autenticado
    if (!validadCedula || !validarPerfil) {
      agent.add('🔒 Lo siento, debes identificarte, esta opción solo es válida para usuarios normales');
      return;
    }
    
    // 📚 Llamas a ObtenerRespuestaTitulo_Base para obtener información del título
    const respuestaTitulo = await ObtenerRespuestaTitulo_Base(agent);

    // ✅ Verificas si se obtuvo la información del título correctamente
    if (!respuestaTitulo) {
      console.error('❌ No se pudo obtener la información del título.');
      return; // O maneja el error de acuerdo con tus necesidades
    }

    // 🌐 Asignas las variables globales con la información del título
    nombreTituloGlobal = respuestaTitulo.nombreTituloGlobal;
    descripcionInciGlobal = respuestaTitulo.descripcionInciGlobal;

    // 🕵️‍♂️ Llamas a buscarSolucionBaseConocimientos para buscar en la base de conocimientos
    const resultadoBaseConocimientos = await buscarSolucionBaseConocimientos();

    if (resultadoBaseConocimientos && resultadoBaseConocimientos.length > 0) {
      // 🎉 Realizas acciones en función de las soluciones encontradas
      agent.add(`🚀 ¡Soluciones encontradas!`);

      resultadoBaseConocimientos.forEach((solucion, index) => {
        agent.add(`🆔 ID: ${solucion.id_conocimiento_incidente}, 📖 Título: ${solucion.titulo_conocimiento_incidente}`);
      });
      
      
      bandera = true;
      agent.add('🤖✨ ¡Perfecto! Ahora puedes seleccionar una solución. Escribe el numero 7️⃣ para elegir un título de solución.');
      validarIngresar=true;

     
    } else {
      // 🤔 Manejas el caso en que no se encuentra una solución
      console.log('❌ No se encontró una solución en la base de conocimientos.');

      agent.add("🔍 No se encontró una solución en la base de conocimientos.");
      agent.add("🔧 Reportaremos tu problema al encargado de TICS.");
      validadCedula = false;
    }

  } catch (error) {
    console.error('❌ Error en la función Base_Conocimiento:', error);
    // Maneja el error de acuerdo con tus necesidades
  }
}



async function registrar_INCI_SI(agent) {

  try {
    console.log("nombre_titulo:", nombreTituloGlobal);
    console.log("descripcion_inci:", descripcionInciGlobal);

    const fechaRegi = new Date();
    let estado_incidente = 1;
    let estado_id = 3;
    let cierre_id = 2;
    let asignacion_user_id = null;
    let bandera=false;

    if (nombreTituloGlobal && descripcionInciGlobal) {
      
      const categoriasDisponiblesa = await obtenerCategorias();
      const defectoCate = categoriasDisponiblesa.length > 0 ? categoriasDisponiblesa[0] : null;
      const idCate = defectoCate ? defectoCate.id_cate : null;

      const nivelIncidente = await escala_niveles();
      const defectoNiveles = nivelIncidente.length > 0 ? nivelIncidente[0] : null;
      const idNivel = defectoNiveles ? defectoNiveles.id_nivelescala : null;

      const PrioDispo = await obtenerPrioridad();
      const defectPrio = PrioDispo.length > 0 ? PrioDispo[0] : null;
      const prioridad_id = defectPrio ? defectPrio.id_prioridad : null;

      const ImpactoDis = await obtenerImpactos();
      const defectImpa = ImpactoDis.length > 0 ? ImpactoDis[0] : null;
      const impacto_id = defectImpa ? defectImpa.id_impacto : null;

      const resolucionDispo = await obtenerResolucion();
      const detectReso = resolucionDispo.length > 0 ? resolucionDispo[0] : null;
      const resolucion_id = detectReso ? detectReso.id_resolucion : null;

      const urgenDis = await obtenerUrgencia();
      const defectUr = urgenDis.length > 0 ? urgenDis[0] : null;
      const urgencia_id = defectUr ? defectUr.id_urgencia : null;

      const repoartacion_user_id = usuario_cedula

      const query = `
        INSERT INTO incidente (id_cate, id_estado, id_prioridad, id_impacto, id_urgencia, id_nivelescala, id_reportacion_user, id_asignacion_user, id_cierre, id_resolucion, incidente_nombre, incidente_descrip, fecha_incidente, estatus_incidente)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;

      const valores = [
        idCate,
        estado_id,
        prioridad_id,
        impacto_id,
        urgencia_id,
        idNivel,
        repoartacion_user_id,
        asignacion_user_id,
        cierre_id,
        resolucion_id,
        nombreTituloGlobal, 
        descripcionInciGlobal, 
        fechaRegi,
        estado_incidente
      ];

      await pool.query(query, valores);

      console.log('Incidente registrado exitosamente.');
      agent.add('✅ ¡Incidente resuelto con éxito! He registrado el incidente, estoy aquí para cualquier otro problema ¡Que tengas un excelente día! 🌈');
      validadCedula=false

    } else {
      console.log('Campos obligatorios faltantes:');
      console.log('nombre:', nombreTituloGlobal);
      console.log('descripcion:', nombreTituloGlobal);
      console.log('fechaRegistro:', fechaRegi);

      agent.add('Faltan campos obligatorios para registrar el incidente.');
    }
  } catch (error) {
    console.error('ERROR al registrar el incidente', error);
    
    if (user_asignado && user_asignado.length > 0) {
      const queryRevertirUsuarioAsignado = 'UPDATE asignacion_user SET disponibilidad = 0 WHERE id_asignacion_user = $1';
      await pool.query(queryRevertirUsuarioAsignado, [user_asignado[0].id_asignacion_user]);
    }

    agent.add('Ocurrió un error al registrar el incidente.');
  }
}

async function obtenerIncidentesReportados(idReportacionUser) {
  const query = `
      SELECT
          c_reportador.nombre_colaborador AS nombre_reportador,
          CASE
              WHEN i.id_estado = 1 THEN 'Nuevo'
              WHEN i.id_estado = 2 THEN 'Pendiente'
              WHEN i.id_estado = 3 THEN 'Cerrado con éxito'
              ELSE 'Estado Desconocido'
          END AS estado_incidente,
          i.incidente_nombre,
          i.incidente_descrip,
          i.fecha_incidente,
          COALESCE(c_asignado.nombre_colaborador, 'Sin asignar') AS nombre_colaborador_asignado
      FROM
          public.incidente i
      JOIN
          public.colaboradores c_reportador ON i.id_reportacion_user = c_reportador.id_colaborador
      LEFT JOIN
          public.asignacion_user a ON i.id_asignacion_user = a.id_asignacion_user
      LEFT JOIN
          public.colaboradores c_asignado ON a.id_usuario = c_asignado.id_colaborador
      WHERE
          i.id_reportacion_user = $1
      ORDER BY
          i.id_incidente DESC
      LIMIT 2;
  `;

  try {
      const { rows } = await pool.query(query, [idReportacionUser]);
      return rows;
  } catch (error) {
      console.error("Lo sentimos, no pudimos obtener información sobre los incidentes reportados", error);
      throw error;
  }
}



async function enviarMensajeTelegram(infoColaborador, telefonoColaborador) {
  try {
    const chatId = telefonoColaborador;
    const mensajeTelegram = `🚨 Nuevo incidente reportado 🚨\n\n‼️ Título: ${nombreTituloGlobal}\n📄 Descripción: ${descripcionInciGlobal}\n\n👤 Información del Colaborador:\n👉 Nombre: ${infoColaborador.nombre_colaborador}\n👉 Apellido: ${infoColaborador.apellido_colaborador}\n🏢 Departamento:${infoColaborador.nombre_departamento}\n📞 Teléfono: ${telefonoColaborador}`;

    // Enviar mensaje a Telegram
    await bot.sendMessage(chatId, mensajeTelegram);
  } catch (error) {
    console.error('ERROR al enviar mensaje a Telegram', error);
  }
}


async function Confirmacion(agent) {
  try {
    if (!bandera) {
      agent.add('👋 Hola! Primero debes invocar al bot antes de realizar esta acción.');
      return;
    }

    const respuestaUsuario = agent.query.toLowerCase();

    // Realizar acciones en base a la respuesta del usuario
    if (respuestaUsuario.includes('si')) {
      agent.add('Procesando incidente');
      await delay(3000);
      await registrar_INCI_SI(agent);
      bandera = false;
      validadCedula = false;
      validar_saludo = false;
      banderaPerfil=false;
      validarIngresar=false
    } else if (respuestaUsuario.includes('no')) {
      agent.add('Procesando incidente');
      await delay(3000);
      await registrar_INCI(agent);

      const infoColaborador = await obtenerInformacionColaborador(usuario_cedula);
      id_asignado = id_asignado.toString();

      // Llamada a la función para enviar mensaje a Telegram
      await enviarMensajeTelegram(infoColaborador, id_asignado);

      agent.add('✅ Incidente enviado al departamento de TICs. Está en estado pendiente. ¡Gracias por tu reporte! 🚀');
      
      bandera = false;
      validar_saludo = false;
      banderaPerfil=false;
      validarIngresar=false
    } else {
      agent.add('No reconocemos la respuesta proporcionada. Por favor, responde "Si" o "No".');
    }

  } catch (error) {
    console.error('ERROR al manejar ConfirmacionIntent', error);
    agent.add('Ocurrió un error al manejar la confirmación.');
  }
}







async function registrar_INCI(agent) {
  let user_asignado;

  try {
    console.log("nombre_titulo:", nombreTituloGlobal);
    console.log("descripcion_inci:", descripcionInciGlobal);

    const fechaRegi = new Date();
    let estado_incidente = 1; // Inicializar el estado como "Nuevo"
    let estado_id = 2;
    let cierre_id = 2;


    if (nombreTituloGlobal && descripcionInciGlobal) {
      user_asignado = await obtenerUsuariosDisponiblesIn();

      if (!user_asignado || user_asignado.length === 0) {
        agent.add('🚨 No hay usuarios asignados disponibles en este momento, tu reporte será enviado al encargado general.');
        console.log('No hay usuarios asignados disponibles en este momento.');
        return;
      }

      const asignacion_user_id = user_asignado[0].id_asignacion_user;
      id_asignado= await obtenerChatId(asignacion_user_id);
      
      const categoriasDisponiblesa = await obtenerCategorias();
      const defectoCate = categoriasDisponiblesa.length > 0 ? categoriasDisponiblesa[0] : null;
      const idCate = defectoCate ? defectoCate.id_cate : null;

      const nivelIncidente = await escala_niveles();
      const defectoNiveles = nivelIncidente.length > 0 ? nivelIncidente[0] : null;
      const idNivel = defectoNiveles ? defectoNiveles.id_nivelescala : null;

      const PrioDispo = await obtenerPrioridad();
      const defectPrio = PrioDispo.length > 0 ? PrioDispo[0] : null;
      const prioridad_id = defectPrio ? defectPrio.id_prioridad : null;

      const ImpactoDis = await obtenerImpactos();
      const defectImpa = ImpactoDis.length > 0 ? ImpactoDis[0] : null;
      const impacto_id = defectImpa ? defectImpa.id_impacto : null;

      const resolucionDispo = await obtenerResolucion();
      const detectReso = resolucionDispo.length > 0 ? resolucionDispo[0] : null;
      const resolucion_id = detectReso ? detectReso.id_resolucion : null;

      const urgenDis = await obtenerUrgencia();
      const defectUr = urgenDis.length > 0 ? urgenDis[0] : null;
      const urgencia_id = defectUr ? defectUr.id_urgencia : null;

      const repoartacion_user_id = usuario_cedula

      const query = `
        INSERT INTO incidente (id_cate, id_estado, id_prioridad, id_impacto, id_urgencia, id_nivelescala, id_reportacion_user, id_asignacion_user, id_cierre, id_resolucion, incidente_nombre, incidente_descrip, fecha_incidente, estatus_incidente)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;

      const valores = [
        idCate,
        estado_id,
        prioridad_id,
        impacto_id,
        urgencia_id,
        idNivel,
        repoartacion_user_id,
        asignacion_user_id,
        cierre_id,
        resolucion_id,
        nombreTituloGlobal, 
        descripcionInciGlobal, 
        fechaRegi,
        estado_incidente
      ];

      await pool.query(query, valores);

      const consultaActualizarAsignacion_user = 'UPDATE asignacion_user SET disponibilidad = 1 WHERE id_asignacion_user = $1';
      await pool.query(consultaActualizarAsignacion_user, [asignacion_user_id]);
      
      console.log('Incidente registrado exitosamente.');
      agent.add('✅ El incidente ha sido registrado exitosamente.');
      validarIngresar=false

    } else {
      console.log('Campos obligatorios faltantes:');
      console.log('nombre:', nombreTituloGlobal);
      console.log('descripcion:', nombreTituloGlobal);
      console.log('fechaRegistro:', fechaRegi);

      agent.add('Faltan campos obligatorios para registrar el incidente.');
    }
  } catch (error) {
    console.error('ERROR al registrar el incidente', error);

    if (user_asignado && user_asignado.length > 0) {
      const queryRevertirUsuarioAsignado = 'UPDATE asignacion_user SET disponibilidad = 0 WHERE id_asignacion_user = $1';
      await pool.query(queryRevertirUsuarioAsignado, [user_asignado[0].id_asignacion_user]);
    }

    agent.add('🚨 Ocurrió un error al registrar el incidente. Por favor, inténtalo más tarde o contacta al soporte técnico.');
  

  }
}

async function obtenerSolucionPorId(id_conocimiento_incidente) {
  try {
    // Verifica si el ID es null o no es un número
    if (!id_conocimiento_incidente || isNaN(id_conocimiento_incidente)) {
      console.error('El ID proporcionado no es válido.');
      return null;
    }

    // Realiza la búsqueda en la base de conocimientos utilizando el ID
    const query = `
      SELECT * 
      FROM public.base_conocimiento_incidentes
      WHERE id_conocimiento_incidente = ${id_conocimiento_incidente};
    `;

    const result = await pool.query(query);

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error al buscar en la base de conocimientos por ID:', error);
    throw error; // Propagar el error para manejarlo en el código que llama a esta función
  }
}




async function buscarSolucionBaseConocimientos() {
  try {
    // Verifica si nombreTituloGlobal es null
    if (nombreTituloGlobal === null) {
      console.error('El título es nulo. No se puede buscar en la base de conocimientos.');
      return null;
    }

    // Utiliza la variable global para obtener el título
    const nombre_titulo = nombreTituloGlobal;

    // Realiza la búsqueda en la base de conocimientos utilizando el título
    const query = `
      SELECT * 
      FROM public.base_conocimiento_incidentes
      WHERE 
        EXISTS (
          SELECT 1
          FROM UNNEST(etiquetas_conocimiento_incidente) AS etiqueta
          WHERE LOWER(etiqueta) LIKE '%${nombre_titulo}%'
        )
      
    `;

    const result = await pool.query(query);

    return result.rows.length > 0 ? result.rows : null;
  } catch (error) {
    console.error('Error al buscar en la base de conocimientos:', error);
    throw error; // Propagar el error para manejarlo en el código que llama a esta función
  }
}



/*---------------------------------------*/

/*Presentacion de respuesta de cada agente al dialogflow y devolviendo a telegram*/

async function SaludoAres(agent) {
 // obtenerTodosLosTelefonosYEnviarMensajes()
  validar_saludo=true;
  agent.add('¡Hola soy Ares! 🤖✨ Me alegra estar aquí. 😊');
  agent.add('Para poder ayudarte, por favor, proporciona tu número de cédula.');
}

async function Estado_Incidente_ADMIN(agent) {
  try {
    const Estados = await obtenerEstado();
    const listaEstados = Estados.map(estado =>
      `**#${estado.id_estado} - ${estado.estado_name}**\n` +
      `   *Descripción:* ${estado.estado_descrip}`
    ).join('\n\n');
    agent.add(`Estados de los incidentes reportados:\n\n${listaEstados}`);
  } catch (error) {
    console.error('Error al ejecutar Estado_Incidente_ADMIN:', error);
    agent.add(`Lo siento, ocurrió un error al obtener los estados de incidentes`);
  }
}

async function Incidente_Cate_Admin(agent) {
  try {
    const categorias = await obtenerCategorias();
    const listaCategorias = categorias.map(categoria =>
      `**#${categoria.id_cate} - ${categoria.nombre_categoria}**\n` +
      `   *Descripción:* ${categoria.descripcion_categoria}`
    ).join('\n\n');
    agent.add(`Las categorías de incidentes son:\n\n${listaCategorias}`);
  } catch (error) {
    console.error('Error al ejecutar Incidente_Cate_Admin:', error);
    agent.add(`Lo siento, ocurrió un error al obtener las categorías de incidentes`);
  }
}

async function Resolucion_Incidente_ADMIN(agent) {
  try {
    const resoluciones = await obtenerResolucion();
    const listaResoluciones = resoluciones.map(resolucion =>
      `**#${resolucion.id_resolucion} - ${resolucion.resolucion_incidente}**\n` +
      `   *Descripción:* ${resolucion.fecha_resolucion}`
    ).join('\n\n');
    agent.add(`Resoluciones:\n\n${listaResoluciones}`);
  } catch (error) {
    console.error('Error al ejecutar Resolucion_Incidente_ADMIN:', error);
    agent.add(`Lo siento, ocurrió un error al obtener las resoluciones de incidentes`);
  }
}

async function Impacto_Incidentes_ADMIN(agent) {
  try {
    const impactos = await obtenerImpactos();
    const listaImpactos = impactos.map(impacto =>
      `**#${impacto.id_impacto} - ${impacto.impacto_name}**\n` +
      `   *Descripción:* ${impacto.impacto_descrip}`
    ).join('\n\n');
    agent.add(`Impactos:\n\n${listaImpactos}`);
  } catch (error) {
    console.error('Error al ejecutar Impacto_Incidentes_ADMIN:', error);
    agent.add(`Lo siento, ocurrió un error al obtener los impactos de incidentes`);
  }
}


async function Cierre_Incidente_ADMIN(agent) {
  try {
    const cierres = await obtenerCierre();
    const listaCierres = cierres.map(cierre =>
      `**#${cierre.id_cierre} - ${cierre.cierre_name}**\n` +
      `   *Descripción:* ${cierre.cierre_descrip}`
    ).join('\n\n');
    agent.add(`Las incidencias cerradas son:\n\n${listaCierres}`);
  } catch (error) {
    console.error('Error al ejecutar Cierre_Incidente_ADMIN:', error);
    agent.add(`Lo siento, ocurrió un error al obtener los cierres de incidentes`);
  }
}

async function Urgencia_Incidente_ADMIN(agent) {
  try {
    const urgencias = await obtenerUrgencia();
    const listaUrgencias = urgencias.map(urgencia =>
      `**#${urgencia.id_urgencia} - ${urgencia.urgencia_name}**\n` +
      `   *Descripción:* ${urgencia.urgencia_descrip}`
    ).join('\n\n');
    agent.add(`Las incidencias de urgencia son:\n\n${listaUrgencias}`);
  } catch (error) {
    console.error('Error al ejecutar Urgencia_Incidente_ADMIN:', error);
    agent.add(`Lo siento, ocurrió un error al obtener las incidencias de urgencia`);
  }
}

async function Prioridad_Incidentes_ADMIN(agent) {
  try {
    const prioridades = await obtenerPrioridad();
    const listaprioridades = prioridades.map(prioridad =>
      `**#${prioridad.id_prioridad} - ${prioridad.prioridad_name}**\n` +
      `   *Descripción:* ${prioridad.prioridad_descrip}`
    ).join('\n\n');
    agent.add(`Las incidencias de prioridades son:\n\n${listaprioridades}`);
  } catch (error) {
    console.error('Error al ejecutar Prioridad_Incidentes_ADMIN:', error);
    agent.add(`Lo siento, ocurrió un error al obtener las incidencias de prioridades`);
  }
}

async function Escalamiento_Niveles_ADMIN(agent){
  try {
    const nivelesEscalamiento = await escala_niveles();
    const listanivel = nivelesEscalamiento.map(nivel =>
      `**#${nivel.id_nivelescala} - ${nivel.nivelescala_name}**\n` +
      `   *Descripción:* ${nivel.nivelescala_descrip}`
    ).join('\n\n');
    agent.add(`Las incidencias de niveles son:\n\n${listanivel}`);
  } catch (error) {
    console.error('Error al ejecutar Escalamiento_Niveles_ADMIN:', error);
    agent.add(`Lo siento, ocurrió un error al obtener las incidencias de niveles de escalamiento`);
  }

}

async function obtenerIncidenteInfo(agent) {
  if (!validadCedula || !validarPerfil) {
    agent.add("🔐 Para acceder a la información de incidentes, primero debes identificarte, esta funcion es solo para usuarios normales");
  } else {
    try {
      agent.add("🕵️‍♂️ Mostrando los últimos dos incidentes reportados:");
      for (const incidente of globalIncidentes) {
        const mensajeIncidente = `
        Detalles:
        🚨 Estado: ${incidente.estado_incidente}
        📝 Incidente: ${incidente.incidente_descrip}
        👤 Reportador: ${incidente.nombre_reportador}
        👥 Asignado a: ${incidente.nombre_colaborador_asignado}
        `;
        agent.add(mensajeIncidente);
      }

      agent.add("¿Deseas hacer alguna otra acción? Recuerda, estas son las demás opciones disponibles:\n\n 2️⃣ Registrar un nuevo incidente.\n 0️⃣ Salir.")

    } catch (error) {
      console.error('Error al obtener información del incidente:', error);
      agent.add('🚫 Ha ocurrido un error al obtener la información del incidente. Por favor, inténtalo de nuevo más tarde.');
    }
  }
}

async function Accion_Admin(agent) {
  console.log("ENTRE A Accion_Admin");

  try {
    console.log("Bandera:", banderaPerfil);

    // Check if the user is an administrator
    if (!banderaPerfil) {
      agent.add("⚠️ Este intento solo está activo para administradores. Acceso denegado.");
      return;
    }

    // If the user is not an administrator, proceed with displaying incidents
    agent.add("👤 Bienvenido. Aquí está la lista de incidentes pendientes:");

    if (incidentesPendientes && incidentesPendientes.length > 0) {
      for (const incidente of incidentesPendientes) {
        const mensajeIncidente = `
          🚨 ID: ${incidente.id_incidente}
          📄 Incidente: ${incidente.incidente_descrip}
          🗓️ Fecha: ${incidente.fecha_incidente}
          👤 Reportador: ${incidente.nombre_reportador}
          📢 Estado: ${incidente.estado_incidente}
          --------------
        `;

        agent.add(mensajeIncidente);
      }
    } else {
      agent.add("👍 No hay incidentes pendientes en los últimos dos días.");
    }
  } catch (error) {
    console.error("Error al mostrar incidentes pendientes:", error);
    agent.add("❌ Ocurrió un error al mostrar incidentes pendientes. Por favor, inténtalo de nuevo más tarde.");
  }
}

function generarToken() {
  const caracteres = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';

  for (let i = 0; i < 6; i++) {
    const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
    token += caracteres.charAt(indiceAleatorio);
  }

  return token;
}

async function actualizarToken(idColaborador, nuevoToken) {
  const query = 'UPDATE httpToken SET token = $1 WHERE ID_colaboradorfk = $2';

  try {
    // Actualiza el token en la base de datos
    await pool.query(query, [nuevoToken, idColaborador]);
    console.log('Token actualizado con éxito.');
  } catch (error) {
    console.error('Error al actualizar el token:', error.message);
    throw error;
  }
}


// Ejemplo de uso

function obtenerIdConocimientoDesdeMensaje(agent) {
  const regex = /\b\d+\b/; // Suponiendo que el ID es una secuencia de dígitos
  const match = agent.query.match(regex);

  if (match) {
    const idConocimiento = parseInt(match[0], 10); // Convertir el match a número entero
    if (!isNaN(idConocimiento) && idConocimiento > 0) {
      return idConocimiento; // Devuelve el ID del conocimiento capturado
    } else {
      // Devuelve un mensaje de advertencia si el ID no es un número válido
      return "El ID del conocimiento debe ser un número entero positivo.";
    }
  }

  return null; // Devuelve null si no se encontró el ID del conocimiento en el mensaje
}







function obtenerCedulaDesdeMensaje(agent) {
  const regex = /\d{10}/; // Suponiendo que el número de cédula tiene 10 dígitos numéricos
  const match = agent.query.match(regex);

  if (match) {
    const numeroCedula = match[0];
    if (numeroCedula.length === 10) {
      return numeroCedula; // Devuelve el número de cédula capturado
    } else {
      // Devuelve un mensaje de advertencia si se proporcionan más o menos de 10 dígitos
      return "El número de cédula debe contener exactamente 10 dígitos.";
    }
  }

  return null; // Devuelve null si no se encontró el número de cédula en el mensaje
}

async function ingresarConocimiento(agent) {
  
  const id_titulo = obtenerIdConocimientoDesdeMensaje(agent);

  if (validarIngresar) {
    if (id_titulo) {
      try {
        // Obtener la solución por ID
        const solucion = await obtenerSolucionPorId(id_titulo);

        if (solucion) {
          // Mostrar la información de la solución
          agent.add(`📖 Título: ${solucion.titulo_conocimiento_incidente}`);
        
          // Procesar la lista de pasos
          const pasos = solucion.contenido_conocimiento_incidente.split(/\d+\.\s+/);
          const pasosFormateados = pasos
            .filter(paso => paso.trim() !== '')
            .map((paso, index) => `${index + 1}. ${paso.trim()}\n`) // Agregamos \n al final de cada paso
            .join(''); // Unimos los pasos sin agregar espacio entre ellos
        
          agent.add(`📝 Contenido:\n${pasosFormateados}`);
         
          // Preguntar por la satisfacción del usuario
          agent.add('💡 ¿La solución proporcionada resolvió tu problema? Por favor, responde "Sí" o "No."\n\n🔄 ¿Quieres ver otra solución? Si es así, escribe el número 7️⃣');
        
          bandera = true;
        
        
        
        

        } else {
          // Manejar el caso en que no se encuentra una solución
          console.log('❌ No se encontró una solución con el ID proporcionado.');

          agent.add("🔍 No se encontró una solución con el ID proporcionado.");
          agent.add("🔧 Reportaremos tu problema al encargado de TICS.");
          validadCedula = false;
        }

      } catch (error) {
        console.error('❌ Error al obtener la solución por ID:', error);
        // Manejar el error de acuerdo con tus necesidades
      }
    } else {
      // Manejar el caso en que no se proporcionó un ID válido
      agent.add("⚠️ Por favor, ingresa un ID válido para buscar la solución.");
    }
  } else {
    // Mensaje cuando no se permite ver la información
    agent.add("🚫 No tienes permisos para ver información. Contacta al administrador si necesitas acceso.");
  }
}













async function validar_cedula(agent) {
  try {
    if (!validar_saludo) {
      agent.add("👋 Hola! Primero debes invocar al bot antes de realizar esta acción.");
      return;
    }

    const numeroCedula = obtenerCedulaDesdeMensaje(agent);
    const { mensaje: mensajeForma, id_usuario } = await obtenerColaboradorPorCedula(numeroCedula);
    console.log("Mensaje Pasado:", mensajeForma);
    console.log("ID del usuario:", id_usuario);
    usuario_cedula = id_usuario;
    console.log(usuario_cedula);

    id_Perfil = await obtenerIdPerfilUsuario(usuario_cedula); // se guarda el perfil de usuario admin o normal

    globalIncidentes = await obtenerIncidentesReportados(usuario_cedula);
    incidentesPendientes  = await obtenerIncidentesAsignadosPendientesUltimosDosDias(usuario_cedula)

    

    if (mensajeForma) {
      agent.add(`${mensajeForma} ¡Validación exitosa! ✅`);

      validadCedula = true;

      if (id_usuario) {
        if (id_Perfil === 2) {
          validarPerfil=false
          banderaPerfil=true
          

          // Acciones para el perfil 2 (Usuario Administrador)
          agent.add("A continuación, te presento las acciones disponibles:\n\n3️⃣ Consultar Pendientes\n4️⃣ Gestionar Incidentes Asignados\n0️⃣ Salir")

         
        
        
        } else {
          // Acciones para otros perfiles (Usuario Normal)
          try {

            
            banderaPerfil=false
            validarPerfil=true
            await InsertarUsuarioRepotado(numeroCedula);
            console.log("*******");
            console.log(globalIncidentes);
            agent.add("A continuación, te presento las opciones disponibles:\n\nSelecciona el número correspondiente según la acción que deseas realizar:\n\n1️⃣ Ver tus incidentes.\n2️⃣ Registrar un nuevo incidente.\n0️⃣ Salir.")


          } catch (error) {
            agent.add("A continuación, te presento las opciones disponibles:\n\nSelecciona el número correspondiente según la acción que deseas realizar:\n\n1️⃣ Ver tus incidentes.\n2️⃣ Registrar un nuevo incidente.\n0️⃣ Salir.")

           
          }
        }
      }
    } else {
      agent.add("❌ Lo siento, no se pudieron validar tus credenciales. Por favor, verifica que proporcionaste la información correcta.");
    }
  } catch (error) {
    console.error("Error al iniciar el chat", error);
    agent.add("🚨 Ocurrió un error al iniciar el chat. Por favor, intenta de nuevo más tarde.");
  }
}

async function gestionar(agent){

  if (id_Perfil === 2) {
    // Generar y actualizar el token
    const tokenUsuario = generarToken();
    actualizarToken(usuario_cedula, tokenUsuario);

    // Proporcionar información al usuario
    agent.add("👉 Para gestionarlos, visita: https://nalvarez.alwaysdata.net/jordy/index.html");
    agent.add("👤 Tu usuario es tu número de cédula y tu token de acceso es el siguiente:");
    agent.add(tokenUsuario);
  } else {
    // Si id_Perfil no cumple con la condición, puedes manejarlo de alguna manera
    agent.add("Lo siento, no tienes permisos para realizar esta acción.");
  }


}




async function Usuarios_Disponibles_incidente(agent) {
  try {
    const usuariosDisponibles = await obtenerUsuariosDisponiblesIn();
    

    if (usuariosDisponibles.length > 0) {
      const nombresUsuarios = usuariosDisponibles.map(usuario => usuario.nombre_colaborador).join(', ');

      agent.add(`👥 Usuarios disponibles para asignar el incidente:\n${nombresUsuarios}`);
      return usuariosDisponibles;  // Devuelve la lista de usuarios disponibles
    } else {
      agent.add('🚨 No hay usuarios disponibles en este momento. Por favor, asigna el incidente a otro usuario o inténtalo más tarde.');
      return null;
    }
  } catch (error) {
    console.error('Error al obtener usuarios disponibles:', error);
    agent.add('🚨 Lo siento, ocurrió un error al obtener usuarios disponibles. Por favor, inténtalo más tarde.');
    return null;
  }
} 

async function obtenerInformacionColaborador(idColaborador) {
  try {
    const result = await pool.query(
      'SELECT c.nombre_colaborador, c.apellido_colaborador, d.nombre_departamento FROM public.colaboradores c JOIN public.departamento d ON c.id_departamento = d.id_departamento WHERE c.id_colaborador = $1',
      [idColaborador]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error al obtener información del colaborador:', error);
    return null;
  }
}

async function Salida(agent) {
  const frasesDespedida = [
    "Hasta luego, ¡que tengas un excelente día! 🌟",
    "Gracias por tu tiempo. ¡Nos vemos pronto! 👋",
    "Espero haber sido de ayuda. ¡Adiós! 🚀",
    "Saliste exitosamente. Siempre aquí para ayudarte. 🌈",
    "Que tengas un día maravilloso. ¡Hasta la próxima! 🌞"
  ];

  // Seleccionar aleatoriamente una frase de despedida
  const despedidaAleatoria = frasesDespedida[Math.floor(Math.random() * frasesDespedida.length)];

  // Restablecer variables a su estado inicial
  validadCedula = false;
  usuario_cedula = 0;
  validar_saludo = false;
  bandera = false;
  id_asignado = 0;
  id_Perfil = 0;
  banderaPerfil = false;
  incidentesPendientes = null;
  validarPerfil = false;
  validarIngresar=false;

  // Agregar la frase de despedida al agente
  agent.add(despedidaAleatoria);
}


async function obtenerChatId(idColaborador) {
  try {
    const result = await pool.query(
      'SELECT telefono_colaborador FROM public.colaboradores WHERE id_colaborador = $1',
      [idColaborador]
    );

    // Devuelve solo el valor del campo 'telefono_colaborador'
    return result.rows[0]?.telefono_colaborador || null;
  } catch (error) {
    console.error('Error al obtener el teléfono del colaborador:', error);
    return null;
  }
}


async function obtenerTodosLosTelefonos() {
  try {
    const result = await pool.query(
      'SELECT telefono_colaborador FROM public.colaboradores'
    );

    // Devuelve todos los valores del campo 'telefono_colaborador'
    return result.rows.map(row => row.telefono_colaborador) || [];
  } catch (error) {
    console.error('Error al obtener los teléfonos de los colaboradores:', error);
    return [];
  }
}

async function obtenerTodosLosTelefonosYEnviarMensajes() {
  try {
    // Obtener todos los teléfonos
    const telefonos = await obtenerTodosLosTelefonos();

    // Realizar acciones con la lista de teléfonos
    for (const telefono of telefonos) {
      // Enviar mensaje a Telegram para cada número de teléfono
      await enviarMensajeActualizacion(telefono);
    }

    // Puedes realizar más acciones después de enviar todos los mensajes si es necesario
  } catch (error) {
    console.error('Error al obtener y enviar mensajes a los colaboradores:', error);
  }
}




async function Reportar_Incidente(agent) {
  try {

    const respuestaTitulo = await ObtenerRespuestaTitulo_Base(agent);

    if (!respuestaTitulo || !respuestaTitulo.nombre_titulo || !respuestaTitulo.descripcion_inci) {
      console.error('No se pudo obtener la información del título o está incompleta:', respuestaTitulo);
      agent.add('No se pudo obtener la información del título o está incompleta.');
    } else {
      console.log('titulo:', respuestaTitulo.nombre_titulo);
      console.log('descripcion: ', respuestaTitulo.descripcion_inci);
      console.log("Información del título obtenida correctamente. Nombre:", respuestaTitulo.nombre_titulo, "Descripción:", respuestaTitulo.descripcion_inci);
      await registrar_INCI(agent, respuestaTitulo.nombre_titulo, respuestaTitulo.descripcion_inci);
      agent.add('El incidente ha sido registrado exitosamente.');
    }
  } catch (error) {
    console.error('Error al registrar el incidente:', error);
    agent.add("Ocurrió un error al registrar el incidente.")
  }
}



/*---------------------------------------*/


app.get("/", (req, res) => {
  res.send("¡Bienvenido, estamos dentro!");
});

app.post("/", express.json(), (request, response) => {
  const agent = new WebhookClient({ request, response });

  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  let intentMap = new Map();
  intentMap.set('Incidente_Cate_Admin', Incidente_Cate_Admin);
  intentMap.set('Estado_Incidente_ADMIN', Estado_Incidente_ADMIN);
  intentMap.set('Impacto_Incidentes_ADMIN', Impacto_Incidentes_ADMIN);
  intentMap.set('Urgencia_Incidente_ADMIN', Urgencia_Incidente_ADMIN);
  intentMap.set('Resolucion_Incidente_ADMIN', Resolucion_Incidente_ADMIN);
  intentMap.set('Cierre_Incidente_ADMIN', Cierre_Incidente_ADMIN);
  intentMap.set('Prioridad_Incidentes_ADMIN', Prioridad_Incidentes_ADMIN)
  intentMap.set('validar_cedula', validar_cedula);
  intentMap.set('Usuarios_Disponibles_incidente',Usuarios_Disponibles_incidente);
  intentMap.set('SaludoAres', SaludoAres);
  intentMap.set('Escalamiento_Niveles_ADMIN', Escalamiento_Niveles_ADMIN);
  intentMap.set('Base_Conocimiento',Base_Conocimiento);
  intentMap.set('Confirmacion',Confirmacion);
  intentMap.set('Consultar_Seguimiento',obtenerIncidenteInfo);
  intentMap.set('Accion_Admin',Accion_Admin);
  intentMap.set('Salida',Salida);
  intentMap.set('gestionar',gestionar);
  intentMap.set('ingresarConocimiento', ingresarConocimiento);
  agent.handleRequest(intentMap);
});

const PORT = 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor en ejecución en el puerto ${PORT}`);
});

// Manejar eventos de conexión y desconexión de la base de datos
pool.on('connect', () => {
  console.log('Conexión a la base de datos establecida con éxito.');
});

pool.on('error', (err) => {
  console.error('Error en la conexión a la base de datos:', err);
});

process.on('SIGINT', () => {
  pool.end();
  console.log('Conexión a la base de datos cerrada debido a la terminación del proceso.');
  process.exit(0);
});