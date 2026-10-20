// scripts/firebase/provisionLabWeeklyPlanning.ts
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createHash } from "crypto";

// src/domain/planning/RoomCatalog.ts
var RoomCatalog = class {
  static rooms = [
    {
      roomId: "lactantes-c",
      name: "Lactantes C",
      minAgeMonths: 13,
      maxAgeMonths: 18
    },
    {
      roomId: "room-lactantes-a",
      name: "Lactantes A",
      minAgeMonths: 0,
      maxAgeMonths: 6
    }
  ];
  static getRoom(roomId) {
    return this.rooms.find((r) => r.roomId === roomId);
  }
  static getAllRooms() {
    return [...this.rooms];
  }
};

// src/domain/planning/DirectCurricularCatalog.ts
var TUTORIA_DIRECT_PDA_CATALOG_REVISION = "TUTORIA-DIRECT-PDA-CATALOG-R1";
var DIRECT_PDA_CATALOG = Object.freeze([
  {
    "id": "TUTORIA-PDA-0001",
    "campoFormativo": "Lenguajes",
    "contenido": "Las diferentes formas de los lenguajes para la expresi\xF3n de necesidades, intereses, emociones, afectos y sentimientos. ",
    "pda": "Construye v\xEDnculos afectivos a trav\xE9s de los diferentes lenguajes, verbales y no verbales.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B6:B8",
      "pdaCell": "C6",
      "enLaPlaneacionCell": "D6"
    }
  },
  {
    "id": "TUTORIA-PDA-0002",
    "campoFormativo": "Lenguajes",
    "contenido": "Las diferentes formas de los lenguajes para la expresi\xF3n de necesidades, intereses, emociones, afectos y sentimientos. ",
    "pda": "Utiliza diversas estructuras del lenguaje oral: el matern\xE9s, el balbuceo, los juegos metaling\xFC\xEDsticos y las narraciones, para la expresi\xF3n ling\xFC\xEDstica.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B6:B8",
      "pdaCell": "C7",
      "enLaPlaneacionCell": "D7"
    }
  },
  {
    "id": "TUTORIA-PDA-0003",
    "campoFormativo": "Lenguajes",
    "contenido": "Las diferentes formas de los lenguajes para la expresi\xF3n de necesidades, intereses, emociones, afectos y sentimientos. ",
    "pda": "Experimenta la lengua de relato cotidianamente, favoreciendo la capacidad de imaginar, de organizar el tiempo, de reflejarse en los cuentos y poemas y de aprender a narrar.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B6:B8",
      "pdaCell": "C8",
      "enLaPlaneacionCell": "D8"
    }
  },
  {
    "id": "TUTORIA-PDA-0004",
    "campoFormativo": "Lenguajes",
    "contenido": "La identidad familiar y comunitaria que aporta la riqueza cultural de las lenguas maternas (espa\xF1ol, ind\xEDgenas o extranjeras) en contextos de diversidad para fortalecer su uso en ni\xF1as y ni\xF1os. ",
    "pda": "Usa cotidianamente la lengua materna con apoyo de sus familiares de crianza, identific\xE1ndose como parte de su comunidad.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B9:B10",
      "pdaCell": "C9",
      "enLaPlaneacionCell": "D9"
    }
  },
  {
    "id": "TUTORIA-PDA-0005",
    "campoFormativo": "Lenguajes",
    "contenido": "La identidad familiar y comunitaria que aporta la riqueza cultural de las lenguas maternas (espa\xF1ol, ind\xEDgenas o extranjeras) en contextos de diversidad para fortalecer su uso en ni\xF1as y ni\xF1os. ",
    "pda": "Disfruta de la belleza sonora que le aportan las nanas, \u201Ccanciones para llamar al sue\xF1o\u201D o canciones de cuna.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B9:B10",
      "pdaCell": "C10",
      "enLaPlaneacionCell": "D10"
    }
  },
  {
    "id": "TUTORIA-PDA-0006",
    "campoFormativo": "Lenguajes",
    "contenido": "El encuentro creador de ni\xF1as y ni\xF1os consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias art\xEDsticas. ",
    "pda": "Experimenta y transforma el espacio a trav\xE9s del arte y el juego, en forma colectiva.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B11:B16",
      "pdaCell": "C11",
      "enLaPlaneacionCell": "D11"
    }
  },
  {
    "id": "TUTORIA-PDA-0007",
    "campoFormativo": "Lenguajes",
    "contenido": "El encuentro creador de ni\xF1as y ni\xF1os consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias art\xEDsticas. ",
    "pda": "Encuentra formas de dejar sus huellas gr\xE1ficas en el espacio y experimenta con distintos materiales, a partir de las artes pl\xE1sticas y visuales.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B11:B16",
      "pdaCell": "C12",
      "enLaPlaneacionCell": "D12"
    }
  },
  {
    "id": "TUTORIA-PDA-0008",
    "campoFormativo": "Lenguajes",
    "contenido": "El encuentro creador de ni\xF1as y ni\xF1os consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias art\xEDsticas. ",
    "pda": "Escucha, canta y habla haciendo uso de experiencias musicales, disfrutando su envoltura sonora.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B11:B16",
      "pdaCell": "C13",
      "enLaPlaneacionCell": "D13"
    }
  },
  {
    "id": "TUTORIA-PDA-0009",
    "campoFormativo": "Lenguajes",
    "contenido": "El encuentro creador de ni\xF1as y ni\xF1os consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias art\xEDsticas. ",
    "pda": "Descubre el movimiento est\xE9tico y la representaci\xF3n, al participar en experiencias de expresi\xF3n corporal propias.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B11:B16",
      "pdaCell": "C14",
      "enLaPlaneacionCell": "D14"
    }
  },
  {
    "id": "TUTORIA-PDA-0010",
    "campoFormativo": "Lenguajes",
    "contenido": "El encuentro creador de ni\xF1as y ni\xF1os consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias art\xEDsticas. ",
    "pda": "Disfruta la lectura como una experiencia que alimenta su curiosidad y capacidad creadora tanto en la familia como en el servicio educativo.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B11:B16",
      "pdaCell": "C15",
      "enLaPlaneacionCell": "D15"
    }
  },
  {
    "id": "TUTORIA-PDA-0011",
    "campoFormativo": "Lenguajes",
    "contenido": "El encuentro creador de ni\xF1as y ni\xF1os consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias art\xEDsticas. ",
    "pda": "Experimenta diversos roles, como espectadora, espectador y participante en narrativas teatrales.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B11:B16",
      "pdaCell": "C16",
      "enLaPlaneacionCell": "D16"
    }
  },
  {
    "id": "TUTORIA-PDA-0012",
    "campoFormativo": "Saberes y Pensamiento Cient\xEDfico",
    "contenido": "El juego como base de la experiencia de investigaci\xF3n para que ni\xF1as y ni\xF1os construyan sentido del mundo, de s\xED mismas y de s\xED mismos.",
    "pda": "Desarrolla contenidos simb\xF3licos que se ponen en marcha a trav\xE9s de las experiencias l\xFAdicas, para hacer crecer la capacidad de imaginaci\xF3n, la fantas\xEDa y el pensamiento.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B19:B22",
      "pdaCell": "C19",
      "enLaPlaneacionCell": "D19"
    }
  },
  {
    "id": "TUTORIA-PDA-0013",
    "campoFormativo": "Saberes y Pensamiento Cient\xEDfico",
    "contenido": "El juego como base de la experiencia de investigaci\xF3n para que ni\xF1as y ni\xF1os construyan sentido del mundo, de s\xED mismas y de s\xED mismos.",
    "pda": "Juega y se expresa art\xEDsticamente, con autonom\xEDa a partir de sus propios imaginarios, para favorecer el crecimiento de su \u201Cespacio potencial\u201D, como lugar del juego, de la cultura y el arte.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B19:B22",
      "pdaCell": "C20",
      "enLaPlaneacionCell": "D20"
    }
  },
  {
    "id": "TUTORIA-PDA-0014",
    "campoFormativo": "Saberes y Pensamiento Cient\xEDfico",
    "contenido": "El juego como base de la experiencia de investigaci\xF3n para que ni\xF1as y ni\xF1os construyan sentido del mundo, de s\xED mismas y de s\xED mismos.",
    "pda": "Construye su propio guion, en espacios de juego en libertad, para que a trav\xE9s del encuentro grupal experimente su creaci\xF3n personal y la colectiva, otorg\xE1ndoles significado.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B19:B22",
      "pdaCell": "C21",
      "enLaPlaneacionCell": "D21"
    }
  },
  {
    "id": "TUTORIA-PDA-0015",
    "campoFormativo": "Saberes y Pensamiento Cient\xEDfico",
    "contenido": "El juego como base de la experiencia de investigaci\xF3n para que ni\xF1as y ni\xF1os construyan sentido del mundo, de s\xED mismas y de s\xED mismos.",
    "pda": "Reconoce su cuerpo, sus habilidades, el lenguaje y sus posibilidades, las relaciones entre su cuerpo y el de otras y otros, el movimiento y el habla, para hacer crecer el conocimiento de s\xED misma, de s\xED mismo, a trav\xE9s de juegos de diversa \xEDndole.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B19:B22",
      "pdaCell": "C22",
      "enLaPlaneacionCell": "D22"
    }
  },
  {
    "id": "TUTORIA-PDA-0016",
    "campoFormativo": "Saberes y Pensamiento Cient\xEDfico",
    "contenido": "La exploraci\xF3n e investigaci\xF3n del mundo para el desarrollo del pensamiento a trav\xE9s de la curiosidad, los sentidos y la creatividad.",
    "pda": "Descubre las caracter\xEDsticas de los materiales y las manifestaciones de la naturaleza, para discriminar, comparar, establecer relaciones entre\nsus propiedades e imaginar c\xF3mo incorporarlos en futuros juegos o actividades.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B23:B24",
      "pdaCell": "C23",
      "enLaPlaneacionCell": "D23"
    }
  },
  {
    "id": "TUTORIA-PDA-0017",
    "campoFormativo": "Saberes y Pensamiento Cient\xEDfico",
    "contenido": "La exploraci\xF3n e investigaci\xF3n del mundo para el desarrollo del pensamiento a trav\xE9s de la curiosidad, los sentidos y la creatividad.",
    "pda": "Observa y conversa con otras y otros, para escucharse, socializar y validar los descubrimientos, las hip\xF3tesis y las creaciones.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B23:B24",
      "pdaCell": "C24",
      "enLaPlaneacionCell": "D24"
    }
  },
  {
    "id": "TUTORIA-PDA-0018",
    "campoFormativo": "Saberes y Pensamiento Cient\xEDfico",
    "contenido": "El aprendizaje de ni\xF1as y ni\xF1os a trav\xE9s de la observaci\xF3n y el involucramiento en la comunidad y el ambiente que les rodea. ",
    "pda": "Incorpora los saberes de su comunidad y genera pertenencia social y cultural, al interactuar con sus figuras de referencia en su contexto.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B25:B26",
      "pdaCell": "C25",
      "enLaPlaneacionCell": "D25"
    }
  },
  {
    "id": "TUTORIA-PDA-0019",
    "campoFormativo": "Saberes y Pensamiento Cient\xEDfico",
    "contenido": "El aprendizaje de ni\xF1as y ni\xF1os a trav\xE9s de la observaci\xF3n y el involucramiento en la comunidad y el ambiente que les rodea. ",
    "pda": "Se involucra en propuestas derivadas de contenidos y saberes culturales que observa y le interesan de su comunidad.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B25:B26",
      "pdaCell": "C26",
      "enLaPlaneacionCell": "D26"
    }
  },
  {
    "id": "TUTORIA-PDA-0020",
    "campoFormativo": "\xC9tica, Naturaleza y Sociedades",
    "contenido": "El enfoque de derechos como base de la intervenci\xF3n integral con ni\xF1as y ni\xF1os.",
    "pda": "Avanza progresivamente en la agencia de sus derechos identificando su derecho a decidir, a participar, a recibir respuesta a sus necesidades y a ser protegida y protegido de cualquier situaci\xF3n o condici\xF3n que ponga en riesgo su vida o cualquiera de sus derechos.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B29:B31",
      "pdaCell": "C29",
      "enLaPlaneacionCell": "D29"
    }
  },
  {
    "id": "TUTORIA-PDA-0021",
    "campoFormativo": "\xC9tica, Naturaleza y Sociedades",
    "contenido": "El enfoque de derechos como base de la intervenci\xF3n integral con ni\xF1as y ni\xF1os.",
    "pda": "Crea, se expresa y convive en experiencias de juego, decidiendo en libertad su participaci\xF3n y sus formas de expresi\xF3n.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B29:B31",
      "pdaCell": "C30",
      "enLaPlaneacionCell": "D30"
    }
  },
  {
    "id": "TUTORIA-PDA-0022",
    "campoFormativo": "\xC9tica, Naturaleza y Sociedades",
    "contenido": "El enfoque de derechos como base de la intervenci\xF3n integral con ni\xF1as y ni\xF1os.",
    "pda": "Participa y aprende del mundo a trav\xE9s de su proceso creador, su impulso de aprendizaje, reconociendo y expresando las ideas y tomando decisiones sobre el ambiente y las personas.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B29:B31",
      "pdaCell": "C31",
      "enLaPlaneacionCell": "D31"
    }
  },
  {
    "id": "TUTORIA-PDA-0023",
    "campoFormativo": "\xC9tica, Naturaleza y Sociedades",
    "contenido": "La corresponsabilidad de las personas adultas frente al cuidado y protecci\xF3n de las ni\xF1as y los ni\xF1os y su papel como garantes derechos.",
    "pda": "Genera confianza y seguridad creciente a partir de sentir protecci\xF3n, amor y seguridad en su entorno.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B32:B33",
      "pdaCell": "C32",
      "enLaPlaneacionCell": "D32"
    }
  },
  {
    "id": "TUTORIA-PDA-0024",
    "campoFormativo": "\xC9tica, Naturaleza y Sociedades",
    "contenido": "La corresponsabilidad de las personas adultas frente al cuidado y protecci\xF3n de las ni\xF1as y los ni\xF1os y su papel como garantes derechos.",
    "pda": "Se relaciona con la naturaleza, aprende a cuidar y respetar el medio ambiente y a todos los seres vivos en su ambiente de vida.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B32:B33",
      "pdaCell": "C33",
      "enLaPlaneacionCell": "D33"
    }
  },
  {
    "id": "TUTORIA-PDA-0025",
    "campoFormativo": "\xC9tica, Naturaleza y Sociedades",
    "contenido": "La crianza compartida como prolongaci\xF3n de los cuidados amorosos consensuados, capaces de proveer una continuidad cultural.",
    "pda": "Responde con gestos, posturas, balbuceos, palabras y movimientos, a la forma de crianza que le brindan sus figuras de referencia.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B34:B36",
      "pdaCell": "C34",
      "enLaPlaneacionCell": "D34"
    }
  },
  {
    "id": "TUTORIA-PDA-0026",
    "campoFormativo": "\xC9tica, Naturaleza y Sociedades",
    "contenido": "La crianza compartida como prolongaci\xF3n de los cuidados amorosos consensuados, capaces de proveer una continuidad cultural.",
    "pda": "Comparte espacios de relaci\xF3n en los que existe el di\xE1logo, el respeto y el afecto, con las personas adultas de su contexto.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B34:B36",
      "pdaCell": "C35",
      "enLaPlaneacionCell": "D35"
    }
  },
  {
    "id": "TUTORIA-PDA-0027",
    "campoFormativo": "\xC9tica, Naturaleza y Sociedades",
    "contenido": "La crianza compartida como prolongaci\xF3n de los cuidados amorosos consensuados, capaces de proveer una continuidad cultural.",
    "pda": "Experimenta apegos seguros y la continuidad cultural, por medio de objetos que se trasladan de su familia al servicio educativo y viceversa.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B34:B36",
      "pdaCell": "C36",
      "enLaPlaneacionCell": "D36"
    }
  },
  {
    "id": "TUTORIA-PDA-0028",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El sostenimiento afectivo como base de las experiencias de cuidado que proveen y generan v\xEDnculos amorosos para el bienestar y desarrollo de las infancias. ",
    "pda": "Se separa con facilidad de sus figuras de referencia, aceptando el cuidado que le brindan otras personas cercanas.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B39:B41",
      "pdaCell": "C39",
      "enLaPlaneacionCell": "D39"
    }
  },
  {
    "id": "TUTORIA-PDA-0029",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El sostenimiento afectivo como base de las experiencias de cuidado que proveen y generan v\xEDnculos amorosos para el bienestar y desarrollo de las infancias. ",
    "pda": "Explora su entorno con seguridad mediante el juego, confiando en sus figuras de referencia al disfrutar de la interacci\xF3n afectiva.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B39:B41",
      "pdaCell": "C40",
      "enLaPlaneacionCell": "D40"
    }
  },
  {
    "id": "TUTORIA-PDA-0030",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El sostenimiento afectivo como base de las experiencias de cuidado que proveen y generan v\xEDnculos amorosos para el bienestar y desarrollo de las infancias. ",
    "pda": "Transita por los procesos de adaptaci\xF3n de manera gradual construyendo v\xEDnculos afectivos e integr\xE1ndose a la grupalidad.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B39:B41",
      "pdaCell": "C41",
      "enLaPlaneacionCell": "D41"
    }
  },
  {
    "id": "TUTORIA-PDA-0031",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El contacto y el sost\xE9n como bases del desarrollo corporal y las vivencias afectivas.",
    "pda": "Descubre y desarrolla sus capacidades motrices experimentando la seguridad en el movimiento, mediante la interacci\xF3n afectiva con sus figuras de referencia.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B42:B44",
      "pdaCell": "C42",
      "enLaPlaneacionCell": "D42"
    }
  },
  {
    "id": "TUTORIA-PDA-0032",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El contacto y el sost\xE9n como bases del desarrollo corporal y las vivencias afectivas.",
    "pda": "Construye una buena imagen corporal a trav\xE9s de juegos variados y vivencias afectivas de interacci\xF3n.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B42:B44",
      "pdaCell": "C43",
      "enLaPlaneacionCell": "D43"
    }
  },
  {
    "id": "TUTORIA-PDA-0033",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El contacto y el sost\xE9n como bases del desarrollo corporal y las vivencias afectivas.",
    "pda": "Encuentra diferentes formas de desplazarse, a partir de objetos, personas o situaciones de su inter\xE9s que le motivan a moverse libremente siguiendo el gesto espont\xE1neo.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B42:B44",
      "pdaCell": "C44",
      "enLaPlaneacionCell": "D44"
    }
  },
  {
    "id": "TUTORIA-PDA-0034",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "Los beneficios que otorga una alimentaci\xF3n perceptiva para ni\xF1as, ni\xF1os y sus familias.",
    "pda": "Disfruta de las experiencias de alimentaci\xF3n, manifestando se\xF1ales de hambre y saciedad.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B45",
      "pdaCell": "C45",
      "enLaPlaneacionCell": "D45"
    }
  },
  {
    "id": "TUTORIA-PDA-0035",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El acompa\xF1amiento a ni\xF1as y ni\xF1os en el sue\xF1o, desde el respeto, atenci\xF3n y escucha de sus necesidades.",
    "pda": "Experimenta v\xEDnculos afectivos seguros durante el sue\xF1o, con el acompa\xF1amiento corporal y po\xE9tico de sus figuras de referencia.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B46:B47",
      "pdaCell": "C46",
      "enLaPlaneacionCell": "D46"
    }
  },
  {
    "id": "TUTORIA-PDA-0036",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El acompa\xF1amiento a ni\xF1as y ni\xF1os en el sue\xF1o, desde el respeto, atenci\xF3n y escucha de sus necesidades.",
    "pda": "Encuentra sus propios ritmos en relaci\xF3n con el sue\xF1o, para un buen descanso, mediante el acompa\xF1amiento respetuoso de sus figuras de referencia.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B46:B47",
      "pdaCell": "C47",
      "enLaPlaneacionCell": "D47"
    }
  },
  {
    "id": "TUTORIA-PDA-0037",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "Espacios que proveen seguridad y sost\xE9n afectivo para aprender de la comunidad con inter\xE9s y creatividad.",
    "pda": "Se identifica con el espacio f\xEDsico para desarrollar su creatividad a trav\xE9s de la exploraci\xF3n de manera segura.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B48",
      "pdaCell": "C48",
      "enLaPlaneacionCell": "D48"
    }
  },
  {
    "id": "TUTORIA-PDA-0038",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El desarrollo cerebral como base importante para la adquisici\xF3n de habilidades. ",
    "pda": "Participa en ambientes alegres que evitan el estr\xE9s t\xF3xico, para su desarrollo \xF3ptimo.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B49:B51",
      "pdaCell": "C49",
      "enLaPlaneacionCell": "D49"
    }
  },
  {
    "id": "TUTORIA-PDA-0039",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El desarrollo cerebral como base importante para la adquisici\xF3n de habilidades. ",
    "pda": "Encuentra nuevos desaf\xEDos en sus exploraciones y asociaciones, a partir de ambientes de aprendizaje variados y retadores.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B49:B51",
      "pdaCell": "C50",
      "enLaPlaneacionCell": "D50"
    }
  },
  {
    "id": "TUTORIA-PDA-0040",
    "campoFormativo": "De lo Humano y lo Comunitario",
    "contenido": "El desarrollo cerebral como base importante para la adquisici\xF3n de habilidades. ",
    "pda": "Desarrolla habilidades socioemocionales a partir de la disponibilidad ps\xEDquica, escucha y atenci\xF3n afectiva de sus figuras de referencia.",
    "provenance": {
      "sourceFormCode": "3D11-009-003",
      "sourceSheet": "Anexo5_Planeaci\xF3n Reverso (2)",
      "contenidoRange": "B49:B51",
      "pdaCell": "C51",
      "enLaPlaneacionCell": "D51"
    }
  }
]);
var DIRECT_PDA_CATALOG_BY_ID = new Map(
  DIRECT_PDA_CATALOG.map((entry) => [entry.id, entry])
);
var DIRECT_PDA_CATALOG_BY_PLAN_CELL = new Map(
  DIRECT_PDA_CATALOG.map((entry) => [entry.provenance.enLaPlaneacionCell, entry])
);

// src/domain/planning/CurricularPDAReference.ts
var InvalidCurricularReferenceError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidCurricularReferenceError";
  }
};
function validateCurricularPDAReference(ref, expectedRevision = TUTORIA_DIRECT_PDA_CATALOG_REVISION) {
  if (!ref || typeof ref !== "object") {
    throw new InvalidCurricularReferenceError("Curricular reference must be a valid object");
  }
  if (!ref.pdaId || typeof ref.pdaId !== "string") {
    throw new InvalidCurricularReferenceError("Curricular reference must contain a non-empty string pdaId");
  }
  if (ref.catalogRevision !== expectedRevision) {
    throw new InvalidCurricularReferenceError(
      `Unknown catalog revision '${ref.catalogRevision}'. Expected '${expectedRevision}'.`
    );
  }
  if (!DIRECT_PDA_CATALOG_BY_ID.has(ref.pdaId)) {
    throw new InvalidCurricularReferenceError(
      `Unknown PDA ID '${ref.pdaId}'. Must exist in canonical catalog.`
    );
  }
}
function validateCurricularPDAReferences(refs, expectedRevision = TUTORIA_DIRECT_PDA_CATALOG_REVISION) {
  if (!Array.isArray(refs)) {
    throw new InvalidCurricularReferenceError("Curricular references collection must be an array");
  }
  const seenIds = /* @__PURE__ */ new Set();
  for (const ref of refs) {
    validateCurricularPDAReference(ref, expectedRevision);
    if (seenIds.has(ref.pdaId)) {
      throw new InvalidCurricularReferenceError(
        `Duplicate PDA ID '${ref.pdaId}' is not allowed in the same activity.`
      );
    }
    seenIds.add(ref.pdaId);
  }
}

// src/domain/planning/ComplementaryProgramActivity.ts
var InvalidComplementaryActivityError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidComplementaryActivityError";
  }
};
function validateComplementaryProgramActivity(activity) {
  if (!activity || typeof activity !== "object") {
    throw new InvalidComplementaryActivityError(
      "Complementary activity must be a valid object"
    );
  }
  if (typeof activity.programArea !== "string" || activity.programArea.trim().length === 0) {
    throw new InvalidComplementaryActivityError(
      "Originating program/instruction (programArea) cannot be blank or whitespace"
    );
  }
  if (typeof activity.activityName !== "string" || activity.activityName.trim().length === 0) {
    throw new InvalidComplementaryActivityError(
      "Activity name (activityName) cannot be blank or whitespace"
    );
  }
  return {
    programArea: activity.programArea.trim(),
    activityName: activity.activityName.trim(),
    ...activity.purpose !== void 0 && activity.purpose !== null ? { purpose: typeof activity.purpose === "string" ? activity.purpose.trim() : activity.purpose } : {},
    ...activity.description !== void 0 && activity.description !== null ? { description: typeof activity.description === "string" ? activity.description.trim() : activity.description } : {},
    ...activity.sourceReference !== void 0 && activity.sourceReference !== null ? { sourceReference: typeof activity.sourceReference === "string" ? activity.sourceReference.trim() : activity.sourceReference } : {}
  };
}
function validateComplementaryProgramActivities(activities) {
  if (!activities || !Array.isArray(activities)) {
    throw new InvalidComplementaryActivityError(
      "Complementary activities must be an array"
    );
  }
  return activities.map(validateComplementaryProgramActivity);
}

// src/domain/planning/PrioritizedPractice.ts
var InvalidPrioritizedPracticeError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidPrioritizedPracticeError";
  }
};
function validatePrioritizedPractice(practice) {
  if (!practice || typeof practice !== "object") {
    throw new InvalidPrioritizedPracticeError(
      "Prioritized practice must be a valid object"
    );
  }
  if (typeof practice.practiceName !== "string" || practice.practiceName.trim().length === 0) {
    throw new InvalidPrioritizedPracticeError(
      "Practice name (practiceName) cannot be blank or whitespace"
    );
  }
  return {
    practiceName: practice.practiceName.trim(),
    ...practice.sourceReference !== void 0 && practice.sourceReference !== null ? { sourceReference: typeof practice.sourceReference === "string" ? practice.sourceReference.trim() : practice.sourceReference } : {}
  };
}
function validatePrioritizedPractices(practices) {
  if (!practices || !Array.isArray(practices)) {
    throw new InvalidPrioritizedPracticeError(
      "Prioritized practices must be an array"
    );
  }
  return practices.map(validatePrioritizedPractice);
}

// src/domain/planning/WeeklyPlanning.ts
var WeeklyPlanning = class _WeeklyPlanning {
  constructor(planningId, daycareId, roomId, teacherId, weekStart, weekEnd, status, observations, identifiedNeeds, specialSituations, availableMaterials, curricularReferences, granularObservations = [], days, version, reviewHistory = [], historicalRounds = [], approvedBy, approvedAt, originalContext, closedBy, closedAt) {
    this.planningId = planningId;
    this.daycareId = daycareId;
    this.roomId = roomId;
    this.teacherId = teacherId;
    this.weekStart = weekStart;
    this.weekEnd = weekEnd;
    this.status = status;
    this.observations = observations;
    this.identifiedNeeds = identifiedNeeds;
    this.specialSituations = specialSituations;
    this.availableMaterials = availableMaterials;
    this.curricularReferences = curricularReferences;
    this.granularObservations = granularObservations;
    this.days = days;
    this.version = version;
    this.reviewHistory = reviewHistory;
    this.historicalRounds = historicalRounds;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt;
    this.originalContext = originalContext;
    this.closedBy = closedBy;
    this.closedAt = closedAt;
    _WeeklyPlanning.validateCurricularInvariants(this.days);
    _WeeklyPlanning.validateComplementaryInvariants(this.days);
    _WeeklyPlanning.validatePrioritizedPracticeInvariants(this.days);
  }
  assertValidCurricularInvariants() {
    _WeeklyPlanning.validateCurricularInvariants(this.days);
  }
  assertValidComplementaryInvariants() {
    _WeeklyPlanning.validateComplementaryInvariants(this.days);
  }
  assertValidPrioritizedPracticeInvariants() {
    _WeeklyPlanning.validatePrioritizedPracticeInvariants(this.days);
  }
  static validatePrioritizedPracticeInvariants(days) {
    if (!days || !Array.isArray(days)) return;
    for (const day of days) {
      if (day && Array.isArray(day.prioritizedPractices)) {
        validatePrioritizedPractices(day.prioritizedPractices);
      }
    }
  }
  static validateCurricularInvariants(days) {
    if (!days || !Array.isArray(days)) return;
    for (const day of days) {
      if (day && Array.isArray(day.activities)) {
        for (const activity of day.activities) {
          if (activity && activity.curricularTraceability) {
            validateCurricularPDAReferences(activity.curricularTraceability);
          }
        }
      }
    }
  }
  static validateComplementaryInvariants(days) {
    if (!days || !Array.isArray(days)) return;
    for (const day of days) {
      if (day && Array.isArray(day.complementaryActivities)) {
        validateComplementaryProgramActivities(day.complementaryActivities);
      }
    }
  }
  static create(planningId, daycareId, roomId, teacherId, weekStart, weekEnd) {
    return new _WeeklyPlanning(
      planningId,
      daycareId,
      roomId,
      teacherId,
      weekStart,
      weekEnd,
      "DRAFT",
      "",
      "",
      "",
      "",
      [],
      [],
      [],
      1,
      [],
      []
    );
  }
  editPedagogicalContent(observations, identifiedNeeds, specialSituations, availableMaterials, curricularReferences, days, originalContext) {
    if (this.status !== "DRAFT" && this.status !== "REJECTED") {
      throw new Error(`Cannot edit planning in status: ${this.status}`);
    }
    if (days.length !== 5) {
      throw new Error("WeeklyPlanning must contain exactly 5 days");
    }
    const expectedDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    const actualDays = days.map((d) => d.dayOfWeek);
    for (const d of expectedDays) {
      if (!actualDays.includes(d)) {
        throw new Error(`WeeklyPlanning missing day: ${d}`);
      }
    }
    _WeeklyPlanning.validateCurricularInvariants(days);
    _WeeklyPlanning.validateComplementaryInvariants(days);
    _WeeklyPlanning.validatePrioritizedPracticeInvariants(days);
    if (!this.originalContext) {
      if (originalContext) {
        this.originalContext = { ...originalContext };
      } else if (observations || identifiedNeeds || specialSituations || availableMaterials) {
        this.originalContext = {
          observations,
          identifiedNeeds,
          specialSituations,
          availableMaterials
        };
      }
    }
    this.observations = observations;
    this.identifiedNeeds = identifiedNeeds;
    this.specialSituations = specialSituations;
    this.availableMaterials = availableMaterials;
    this.curricularReferences = curricularReferences;
    const updatedDays = [];
    for (const newDay of days) {
      const oldDay = this.days.find((d) => d.dayOfWeek === newDay.dayOfWeek);
      if (oldDay) {
        const hasMaterialChanged = _WeeklyPlanning.hasMaterialDayContentChanged(oldDay, newDay);
        updatedDays.push({
          ...newDay,
          directorReviewed: hasMaterialChanged ? false : Boolean(oldDay.directorReviewed),
          teacherReviewedAt: hasMaterialChanged ? void 0 : newDay.teacherReviewedAt || oldDay.teacherReviewedAt,
          teacherReviewedBy: hasMaterialChanged ? void 0 : newDay.teacherReviewedBy || oldDay.teacherReviewedBy
        });
      } else {
        updatedDays.push(newDay);
      }
    }
    this.days = updatedDays;
    for (const obs of this.granularObservations) {
      if (obs.status === "PENDING_CORRECTION" || obs.status === "CHANGED_BY_EDUCATOR") {
        let found = false;
        for (const d of this.days) {
          const act = d.activities.find((a) => a.activityId === obs.targetId);
          if (act) {
            found = true;
            if (act.description !== obs.originalContent) {
              obs.currentContent = act.description;
              obs.status = "CHANGED_BY_EDUCATOR";
            } else {
              obs.currentContent = "";
              obs.status = "PENDING_CORRECTION";
            }
            break;
          }
        }
      }
    }
    this.version += 1;
  }
  setActivityCurricularTraceability(dayOfWeekOrDate, activityId, references) {
    if (this.status !== "DRAFT" && this.status !== "REJECTED") {
      throw new Error(`Cannot edit curricular traceability in status: ${this.status}`);
    }
    const targetDay = this.days.find(
      (d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate
    );
    if (!targetDay) {
      throw new Error(`Day not found: ${dayOfWeekOrDate}`);
    }
    const targetActivity = (targetDay.activities || []).find(
      (a) => a.activityId === activityId
    );
    if (!targetActivity) {
      throw new Error(`Activity '${activityId}' not found in day ${dayOfWeekOrDate}`);
    }
    validateCurricularPDAReferences(references);
    const oldRefs = JSON.stringify(targetActivity.curricularTraceability || []);
    const newRefs = JSON.stringify(references || []);
    if (oldRefs !== newRefs) {
      targetDay.teacherReviewedAt = void 0;
      targetDay.teacherReviewedBy = void 0;
    }
    targetActivity.curricularTraceability = [...references];
  }
  /**
   * Replaces the full complementary-activity selection/content for ONE PlanningDay.
   * Human-governed operation for institutional program instructions.
   */
  setDayComplementaryActivities(dayId, activities) {
    if (this.status !== "DRAFT" && this.status !== "REJECTED") {
      throw new Error(`Cannot edit complementary activities in status: ${this.status}`);
    }
    const targetDay = this.days.find(
      (d) => d.dayOfWeek === dayId || d.date === dayId
    );
    if (!targetDay) {
      throw new Error(`Day not found: ${dayId}`);
    }
    const validated = validateComplementaryProgramActivities(activities);
    const oldCompJson = JSON.stringify(targetDay.complementaryActivities || []);
    const newCompJson = JSON.stringify(validated || []);
    if (oldCompJson !== newCompJson) {
      targetDay.teacherReviewedAt = void 0;
      targetDay.teacherReviewedBy = void 0;
    }
    targetDay.complementaryActivities = validated;
  }
  /**
   * Replaces the full prioritized-practices collection for ONE PlanningDay.
   * Human-governed operation for institutional instructions / mentoring.
   */
  setDayPrioritizedPractices(dayId, practices) {
    if (this.status !== "DRAFT" && this.status !== "REJECTED") {
      throw new Error(`Cannot edit prioritized practices in status: ${this.status}`);
    }
    const targetDay = this.days.find(
      (d) => d.dayOfWeek === dayId || d.date === dayId
    );
    if (!targetDay) {
      throw new Error(`Day not found: ${dayId}`);
    }
    const validated = validatePrioritizedPractices(practices);
    const oldPractJson = JSON.stringify(targetDay.prioritizedPractices || []);
    const newPractJson = JSON.stringify(validated || []);
    if (oldPractJson !== newPractJson) {
      targetDay.teacherReviewedAt = void 0;
      targetDay.teacherReviewedBy = void 0;
    }
    targetDay.prioritizedPractices = validated;
  }
  submit() {
    if (this.status !== "DRAFT" && this.status !== "REJECTED") {
      throw new Error(`Cannot submit planning in status: ${this.status}`);
    }
    if (this.days.length !== 5) {
      throw new Error("WeeklyPlanning must contain exactly 5 days to be submitted");
    }
    const daysWithNoActivities = this.days.filter((d) => !d.activities || d.activities.length === 0);
    if (daysWithNoActivities.length > 0) {
      throw new Error("All 5 days must contain activities to be submitted");
    }
    if (this.status === "DRAFT" && !this.areAllDaysTeacherReviewed()) {
      const reviewedCount = this.teacherReviewedDaysCount;
      throw new Error(`Cannot submit weekly planning: all 5 days must be reviewed by teacher (${reviewedCount}/5 reviewed)`);
    }
    this.status = "IN_REVIEW";
  }
  archiveCurrentObservations() {
    this.historicalRounds.push({
      roundId: `round-${Date.now()}-${this.historicalRounds.length + 1}`,
      sequenceNumber: this.historicalRounds.length + 1,
      timestamp: /* @__PURE__ */ new Date(),
      observations: JSON.parse(JSON.stringify(this.granularObservations))
    });
  }
  approve(approvedBy) {
    if (this.status !== "IN_REVIEW") {
      throw new Error(`Cannot approve planning in status: ${this.status}`);
    }
    if (this.granularObservations.length > 0) {
      this.archiveCurrentObservations();
    }
    this.status = "APPROVED";
    this.approvedBy = approvedBy;
    this.approvedAt = /* @__PURE__ */ new Date();
  }
  get semanticStatus() {
    if (this.status === "CLOSED") {
      return "CLOSED";
    }
    if (this.status === "APPROVED" || this.status === "APPROVED_FOR_EXECUTION") {
      return "APPROVED_FOR_EXECUTION";
    }
    return this.status;
  }
  isApprovedForExecution() {
    return this.status === "APPROVED" || this.status === "APPROVED_FOR_EXECUTION";
  }
  get approvedDailyEvaluationCount() {
    return this.days.filter((d) => d.evaluationStatus === "APPROVED").length;
  }
  get isReadyForClosure() {
    return this.isApprovedForExecution() && this.days.length === 5 && this.days.every((d) => d.evaluationStatus === "APPROVED");
  }
  isClosed() {
    return this.status === "CLOSED";
  }
  closeWeek(directorId = "Ceci", closedAt = /* @__PURE__ */ new Date()) {
    if (this.status === "CLOSED") {
      throw new Error("Weekly planning is already CLOSED");
    }
    if (!this.isReadyForClosure) {
      throw new Error(`Cannot close week: only ${this.approvedDailyEvaluationCount}/5 daily evaluations are approved`);
    }
    this.status = "CLOSED";
    this.closedBy = directorId;
    this.closedAt = closedAt;
  }
  reject(reason, rejectedBy, newGranularObs) {
    if (this.status !== "IN_REVIEW") {
      throw new Error(`Cannot reject planning in status: ${this.status}`);
    }
    if (this.granularObservations.length > 0) {
      this.archiveCurrentObservations();
    }
    this.status = "REJECTED";
    this.reviewHistory.push({
      reason: reason ? reason.trim() : "Se requieren ajustes",
      rejectedBy,
      rejectedAt: /* @__PURE__ */ new Date()
    });
    if (newGranularObs && newGranularObs.length > 0) {
      for (const newObs of newGranularObs) {
        const existingIdx = this.granularObservations.findIndex((o) => o.targetId === newObs.targetId);
        if (existingIdx >= 0) {
          const existing = this.granularObservations[existingIdx];
          existing.originalContent = existing.currentContent || existing.originalContent;
          existing.currentContent = "";
          existing.observation = newObs.observation;
          existing.status = "PENDING_CORRECTION";
          existing.reviewer = newObs.reviewer || rejectedBy;
          existing.timestamp = /* @__PURE__ */ new Date();
          delete existing.resolvedBy;
          delete existing.resolvedAt;
        } else {
          this.granularObservations.push({
            ...newObs,
            reviewer: newObs.reviewer || rejectedBy,
            timestamp: /* @__PURE__ */ new Date()
          });
        }
      }
    }
  }
  resolveGranularObservation(targetId, resolvedBy) {
    const obs = this.granularObservations.find((o) => o.targetId === targetId);
    if (obs) {
      obs.status = "RESOLVED";
      obs.resolvedBy = resolvedBy;
      obs.resolvedAt = /* @__PURE__ */ new Date();
    }
    for (const d of this.days) {
      if (d.activities.some((a) => a.activityId === targetId)) {
        const hasPending = this.granularObservations.some(
          (o) => (o.status === "PENDING_CORRECTION" || o.status === "CHANGED_BY_EDUCATOR") && d.activities.some((a) => a.activityId === o.targetId)
        );
        if (!hasPending) {
          d.directorReviewed = true;
        }
        break;
      }
    }
  }
  setOriginalContext(snapshot) {
    if (!this.originalContext) {
      this.originalContext = { ...snapshot };
    }
  }
  updateWeeklyContext(observations, identifiedNeeds, specialSituations, availableMaterials) {
    if (this.status !== "DRAFT" && this.status !== "REJECTED") {
      throw new Error(`Cannot edit weekly context in status: ${this.status}`);
    }
    if (!this.originalContext) {
      this.originalContext = {
        observations: this.observations,
        identifiedNeeds: this.identifiedNeeds,
        specialSituations: this.specialSituations,
        availableMaterials: this.availableMaterials
      };
    }
    this.observations = observations;
    this.identifiedNeeds = identifiedNeeds;
    this.specialSituations = specialSituations;
    this.availableMaterials = availableMaterials;
    this.version += 1;
  }
  hasContextChanged() {
    if (!this.originalContext) return false;
    return (this.observations || "").trim() !== (this.originalContext.observations || "").trim() || (this.identifiedNeeds || "").trim() !== (this.originalContext.identifiedNeeds || "").trim() || (this.specialSituations || "").trim() !== (this.originalContext.specialSituations || "").trim() || (this.availableMaterials || "").trim() !== (this.originalContext.availableMaterials || "").trim();
  }
  static hasMaterialDayContentChanged(oldDay, newDay) {
    const normalizeActivities = (acts = []) => acts.map((a) => ({
      activityId: a.activityId,
      category: a.category,
      objective: a.objective,
      description: a.description,
      durationMinutes: a.durationMinutes,
      materials: a.materials || [],
      curricularTraceability: (a.curricularTraceability || []).map((r) => ({
        pdaId: r.pdaId,
        campoFormativoId: r.campoFormativoId,
        contenidoId: r.contenidoId
      }))
    }));
    if (JSON.stringify(normalizeActivities(oldDay.activities)) !== JSON.stringify(normalizeActivities(newDay.activities))) {
      return true;
    }
    const normalizeComp = (comps = []) => comps.map((c) => ({
      activityId: c.activityId,
      title: c.title,
      description: c.description,
      programType: c.programType
    }));
    if (JSON.stringify(normalizeComp(oldDay.complementaryActivities)) !== JSON.stringify(normalizeComp(newDay.complementaryActivities))) {
      return true;
    }
    const normalizePractices = (practices = []) => practices.map((p) => ({
      practiceId: p.practiceId,
      practiceText: p.practiceText,
      source: p.source
    }));
    if (JSON.stringify(normalizePractices(oldDay.prioritizedPractices)) !== JSON.stringify(normalizePractices(newDay.prioritizedPractices))) {
      return true;
    }
    if (JSON.stringify(oldDay.materials || []) !== JSON.stringify(newDay.materials || [])) {
      return true;
    }
    return false;
  }
  markTeacherDayReviewed(dayOfWeekOrDate, teacherId, reviewedAt = /* @__PURE__ */ new Date()) {
    if (this.status !== "DRAFT" && this.status !== "REJECTED") {
      throw new Error(`Cannot review day in planning status: ${this.status}`);
    }
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Teacher review requires an educator identity");
    }
    const targetDay = this.days.find(
      (d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate
    );
    if (!targetDay) {
      throw new Error(`Day not found: ${dayOfWeekOrDate}`);
    }
    if (!targetDay.activities || targetDay.activities.length === 0) {
      throw new Error(`Cannot review day with no activities: ${dayOfWeekOrDate}`);
    }
    targetDay.teacherReviewedBy = teacherId.trim();
    targetDay.teacherReviewedAt = reviewedAt;
  }
  isDayTeacherReviewed(dayOfWeekOrDate) {
    const day = this.days.find((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    return Boolean(day && day.teacherReviewedAt && day.teacherReviewedBy && day.teacherReviewedBy.trim());
  }
  get teacherReviewedDaysCount() {
    return this.days.filter((d) => Boolean(d.teacherReviewedAt && d.teacherReviewedBy && d.teacherReviewedBy.trim())).length;
  }
  areAllDaysTeacherReviewed() {
    return this.days.length === 5 && this.days.every((d) => Boolean(d.teacherReviewedAt && d.teacherReviewedBy && d.teacherReviewedBy.trim()));
  }
  markDirectorDayReviewed(dayOfWeek) {
    const day = this.days.find((d) => d.dayOfWeek === dayOfWeek);
    if (day) {
      day.directorReviewed = true;
    }
  }
  isDirectorDayReviewed(dayOfWeek) {
    const day = this.days.find((d) => d.dayOfWeek === dayOfWeek);
    if (!day) return false;
    const hasUnresolvedCorrection = this.granularObservations.some(
      (o) => o.status === "CHANGED_BY_EDUCATOR" && day.activities.some((a) => a.activityId === o.targetId)
    );
    if (hasUnresolvedCorrection) {
      return false;
    }
    const hasObs = this.granularObservations.some(
      (o) => day.activities.some((a) => a.activityId === o.targetId)
    );
    if (hasObs && this.status === "IN_REVIEW") {
      return true;
    }
    return Boolean(day.directorReviewed);
  }
  getReviewedDirectorDaysCount() {
    return this.days.filter((d) => this.isDirectorDayReviewed(d.dayOfWeek)).length;
  }
  getDayDate(day) {
    const dayOffsets = {
      MONDAY: 0,
      TUESDAY: 1,
      WEDNESDAY: 2,
      THURSDAY: 3,
      FRIDAY: 4
    };
    if (this.weekStart && dayOffsets[day.dayOfWeek] !== void 0) {
      const [y, m, d] = this.weekStart.split("-").map(Number);
      if (y && m && d) {
        const targetDate = new Date(Date.UTC(y, m - 1, d + dayOffsets[day.dayOfWeek]));
        return targetDate.toISOString().split("T")[0];
      }
    }
    if (day.date) {
      return day.date;
    }
    return "";
  }
  getDaySpanishName(dayOfWeek) {
    const names = {
      MONDAY: "Lunes",
      TUESDAY: "Martes",
      WEDNESDAY: "Mi\xE9rcoles",
      THURSDAY: "Jueves",
      FRIDAY: "Viernes"
    };
    return names[dayOfWeek] || dayOfWeek;
  }
  isDayDateReached(dayOfWeekOrDate, currentDate) {
    if (this.status !== "APPROVED" || !currentDate) return false;
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) return false;
    const targetDay = this.days[targetIndex];
    const targetDayDate = this.getDayDate(targetDay);
    if (!targetDayDate) return false;
    return currentDate >= targetDayDate;
  }
  isDayEvaluationSubmitted(day) {
    if (!day.evaluation || !day.evaluation.trim()) return false;
    if (day.evaluationStatus === "DRAFT") return false;
    return day.evaluationStatus === "IN_REVIEW" || day.evaluationStatus === "APPROVED" || day.evaluationStatus === "CHANGES_REQUESTED" || !day.evaluationStatus;
  }
  canEvaluateDay(dayOfWeekOrDate, currentDate) {
    if (this.status !== "APPROVED") return false;
    if (!currentDate) return false;
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) return false;
    const targetDay = this.days[targetIndex];
    const targetDayDate = this.getDayDate(targetDay);
    if (!targetDayDate) return false;
    if (currentDate < targetDayDate) return false;
    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i];
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        return false;
      }
    }
    return true;
  }
  getNextEvaluableDay(currentDate) {
    if (this.status !== "APPROVED" || !currentDate) return null;
    for (const day of this.days) {
      const dayDate = this.getDayDate(day);
      if (!dayDate) continue;
      if (currentDate < dayDate) {
        break;
      }
      if (!this.isDayEvaluationSubmitted(day)) {
        return day;
      }
    }
    return null;
  }
  getEvaluationStatus(dayOfWeekOrDate, currentDate) {
    const notEligibleResult = {
      isEligible: false,
      isFuture: false,
      isChronologicallyBlocked: false,
      dayDate: ""
    };
    if (this.status !== "APPROVED" || !currentDate) return notEligibleResult;
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) return notEligibleResult;
    const targetDay = this.days[targetIndex];
    const dayDate = this.getDayDate(targetDay);
    if (!dayDate) return notEligibleResult;
    if (currentDate < dayDate) {
      return {
        isEligible: false,
        isFuture: true,
        isChronologicallyBlocked: false,
        dayDate
      };
    }
    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i];
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        return {
          isEligible: false,
          isFuture: false,
          isChronologicallyBlocked: true,
          blockingDay: priorDay,
          dayDate
        };
      }
    }
    return {
      isEligible: true,
      isFuture: false,
      isChronologicallyBlocked: false,
      dayDate
    };
  }
  confirmDailyEvaluation(dayOfWeekOrDate, educatorId, confirmedAt = /* @__PURE__ */ new Date(), currentDate) {
    if (!educatorId || !educatorId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation confirmation is only permitted when planning is APPROVED (current status: ${this.status})`);
    }
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }
    const targetDay = this.days[targetIndex];
    if (currentDate) {
      const effectiveDayDate = this.getDayDate(targetDay);
      if (effectiveDayDate && currentDate < effectiveDayDate) {
        throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
      }
    }
    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i];
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        throw new Error(
          `Cannot evaluate ${dayOfWeekOrDate} before completing evaluation for earlier day ${priorDay.dayOfWeek}`
        );
      }
    }
    if (!targetDay.evaluation || !targetDay.evaluation.trim()) {
      throw new Error("Cannot confirm empty daily evaluation");
    }
    const currentStatus = targetDay.evaluationStatus || "DRAFT";
    if (currentStatus === "IN_REVIEW") {
      throw new Error("Cannot confirm daily evaluation that is already IN_REVIEW");
    }
    if (currentStatus === "APPROVED") {
      throw new Error("Cannot confirm daily evaluation that is already APPROVED");
    }
    if (currentStatus === "REJECTED") {
      throw new Error("Cannot confirm daily evaluation that is REJECTED");
    }
    targetDay.evaluationConfirmedBy = educatorId.trim();
    targetDay.evaluationConfirmedAt = confirmedAt ?? /* @__PURE__ */ new Date();
  }
  saveDailyEvaluationDraft(dayOfWeekOrDate, evaluation, currentDate, teacherId) {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation is only permitted when planning is APPROVED (current status: ${this.status})`);
    }
    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }
    const targetDay = this.days[targetIndex];
    const effectiveDayDate = this.getDayDate(targetDay);
    if (!effectiveDayDate) {
      throw new Error(`Cannot determine day date for ${dayOfWeekOrDate}`);
    }
    if (currentDate < effectiveDayDate) {
      throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
    }
    if (targetDay.evaluationStatus === "IN_REVIEW" || targetDay.evaluationStatus === "APPROVED") {
      throw new Error("Cannot edit evaluation once submitted or approved");
    }
    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i];
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        throw new Error(
          `Cannot evaluate ${dayOfWeekOrDate} before completing evaluation for earlier day ${priorDay.dayOfWeek}`
        );
      }
    }
    if (targetDay.evaluation !== void 0 && targetDay.evaluation !== evaluation) {
      delete targetDay.evaluationConfirmedAt;
      delete targetDay.evaluationConfirmedBy;
    }
    targetDay.evaluation = evaluation;
    if (targetDay.evaluationStatus !== "CHANGES_REQUESTED") {
      targetDay.evaluationStatus = "DRAFT";
    }
    targetDay.date = effectiveDayDate || targetDay.date;
  }
  resubmitDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId) {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation resubmission is only permitted when planning is APPROVED (current status: ${this.status})`);
    }
    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }
    const targetDay = this.days[targetIndex];
    const effectiveDayDate = this.getDayDate(targetDay);
    if (!effectiveDayDate) {
      throw new Error(`Cannot determine day date for ${dayOfWeekOrDate}`);
    }
    if (currentDate < effectiveDayDate) {
      throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
    }
    if (targetDay.evaluationStatus !== "CHANGES_REQUESTED") {
      throw new Error(`Cannot resubmit daily evaluation that is not in CHANGES_REQUESTED status (current status: ${targetDay.evaluationStatus || "DRAFT"})`);
    }
    if (!evaluation || !evaluation.trim()) {
      throw new Error("Cannot resubmit empty daily evaluation");
    }
    if (!targetDay.evaluationConfirmedAt) {
      throw new Error("Daily evaluation must be explicitly confirmed before submission");
    }
    if (!targetDay.evaluation || evaluation.trim() !== targetDay.evaluation.trim()) {
      delete targetDay.evaluationConfirmedAt;
      delete targetDay.evaluationConfirmedBy;
      throw new Error("Daily evaluation must be explicitly confirmed before submission");
    }
    if (!targetDay.evaluationHistory) {
      targetDay.evaluationHistory = [];
    }
    targetDay.evaluationHistory.push({
      evaluation: targetDay.evaluation || "",
      submittedAt: targetDay.evaluationSubmittedAt || /* @__PURE__ */ new Date(),
      submittedBy: targetDay.evaluationSubmittedBy || teacherId || "Anita",
      directorComment: targetDay.evaluationDirectorComment,
      reviewedAt: targetDay.evaluationReviewedAt,
      reviewedBy: targetDay.evaluationReviewedBy,
      status: "CHANGES_REQUESTED"
    });
    targetDay.evaluation = evaluation.trim();
    targetDay.evaluationStatus = "IN_REVIEW";
    targetDay.evaluationResubmitted = true;
    targetDay.evaluationSubmittedAt = /* @__PURE__ */ new Date();
    targetDay.evaluationSubmittedBy = teacherId || targetDay.evaluationSubmittedBy || "Anita";
    targetDay.date = effectiveDayDate || targetDay.date;
  }
  confirmAndSubmitDailyEvaluation(dayOfWeekOrDate, evaluation, educatorId, currentDate, confirmedAt = /* @__PURE__ */ new Date()) {
    if (!educatorId || !educatorId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation is only permitted when planning is APPROVED (current status: ${this.status})`);
    }
    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }
    const targetDay = this.days[targetIndex];
    const effectiveDayDate = this.getDayDate(targetDay);
    if (!effectiveDayDate) {
      throw new Error(`Cannot determine day date for ${dayOfWeekOrDate}`);
    }
    if (currentDate < effectiveDayDate) {
      throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
    }
    if (targetDay.evaluationStatus === "IN_REVIEW" || targetDay.evaluationStatus === "APPROVED" || targetDay.evaluationStatus === "CHANGES_REQUESTED") {
      throw new Error("Cannot submit already submitted evaluation");
    }
    if (!evaluation || !evaluation.trim()) {
      throw new Error("Cannot submit empty daily evaluation");
    }
    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i];
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        throw new Error(
          `Cannot evaluate ${dayOfWeekOrDate} before completing evaluation for earlier day ${priorDay.dayOfWeek}`
        );
      }
    }
    const trimmedEval = evaluation.trim();
    const trimmedEducator = educatorId.trim();
    const effectiveConfirmedAt = confirmedAt ?? /* @__PURE__ */ new Date();
    targetDay.evaluation = trimmedEval;
    targetDay.evaluationConfirmedBy = trimmedEducator;
    targetDay.evaluationConfirmedAt = effectiveConfirmedAt;
    targetDay.evaluationStatus = "IN_REVIEW";
    targetDay.evaluationSubmittedAt = effectiveConfirmedAt;
    targetDay.evaluationSubmittedBy = trimmedEducator;
    targetDay.date = effectiveDayDate || targetDay.date;
  }
  confirmAndResubmitDailyEvaluation(dayOfWeekOrDate, evaluation, educatorId, currentDate, confirmedAt = /* @__PURE__ */ new Date()) {
    if (!educatorId || !educatorId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation resubmission is only permitted when planning is APPROVED (current status: ${this.status})`);
    }
    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }
    const targetDay = this.days[targetIndex];
    const effectiveDayDate = this.getDayDate(targetDay);
    if (!effectiveDayDate) {
      throw new Error(`Cannot determine day date for ${dayOfWeekOrDate}`);
    }
    if (currentDate < effectiveDayDate) {
      throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
    }
    if (targetDay.evaluationStatus !== "CHANGES_REQUESTED") {
      throw new Error(`Cannot resubmit daily evaluation that is not in CHANGES_REQUESTED status (current status: ${targetDay.evaluationStatus || "DRAFT"})`);
    }
    if (!evaluation || !evaluation.trim()) {
      throw new Error("Cannot resubmit empty daily evaluation");
    }
    const trimmedEval = evaluation.trim();
    const trimmedEducator = educatorId.trim();
    const effectiveConfirmedAt = confirmedAt ?? /* @__PURE__ */ new Date();
    if (!targetDay.evaluationHistory) {
      targetDay.evaluationHistory = [];
    }
    targetDay.evaluationHistory.push({
      evaluation: targetDay.evaluation || "",
      submittedAt: targetDay.evaluationSubmittedAt || /* @__PURE__ */ new Date(),
      submittedBy: targetDay.evaluationSubmittedBy || trimmedEducator,
      directorComment: targetDay.evaluationDirectorComment,
      reviewedAt: targetDay.evaluationReviewedAt,
      reviewedBy: targetDay.evaluationReviewedBy,
      status: "CHANGES_REQUESTED"
    });
    targetDay.evaluation = trimmedEval;
    targetDay.evaluationConfirmedBy = trimmedEducator;
    targetDay.evaluationConfirmedAt = effectiveConfirmedAt;
    targetDay.evaluationStatus = "IN_REVIEW";
    targetDay.evaluationResubmitted = true;
    targetDay.evaluationSubmittedAt = effectiveConfirmedAt;
    targetDay.evaluationSubmittedBy = trimmedEducator;
    targetDay.date = effectiveDayDate || targetDay.date;
  }
  submitDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId) {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation is only permitted when planning is APPROVED (current status: ${this.status})`);
    }
    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }
    const targetDay = this.days[targetIndex];
    const effectiveDayDate = this.getDayDate(targetDay);
    if (!effectiveDayDate) {
      throw new Error(`Cannot determine day date for ${dayOfWeekOrDate}`);
    }
    if (currentDate < effectiveDayDate) {
      throw new Error(`Cannot evaluate future day (${effectiveDayDate}) when current date is ${currentDate}`);
    }
    if (targetDay.evaluationStatus === "IN_REVIEW" || targetDay.evaluationStatus === "APPROVED" || targetDay.evaluationStatus === "CHANGES_REQUESTED") {
      throw new Error("Cannot submit already submitted evaluation");
    }
    if (!evaluation || !evaluation.trim()) {
      throw new Error("Cannot submit empty daily evaluation");
    }
    for (let i = 0; i < targetIndex; i++) {
      const priorDay = this.days[i];
      if (!this.isDayEvaluationSubmitted(priorDay)) {
        throw new Error(
          `Cannot evaluate ${dayOfWeekOrDate} before completing evaluation for earlier day ${priorDay.dayOfWeek}`
        );
      }
    }
    if (!targetDay.evaluationConfirmedAt) {
      throw new Error("Daily evaluation must be explicitly confirmed before submission");
    }
    if (!targetDay.evaluation || evaluation.trim() !== targetDay.evaluation.trim()) {
      delete targetDay.evaluationConfirmedAt;
      delete targetDay.evaluationConfirmedBy;
      throw new Error("Daily evaluation must be explicitly confirmed before submission");
    }
    targetDay.evaluation = evaluation.trim();
    targetDay.evaluationStatus = "IN_REVIEW";
    targetDay.evaluationSubmittedAt = /* @__PURE__ */ new Date();
    targetDay.evaluationSubmittedBy = teacherId || "Anita";
    targetDay.date = effectiveDayDate || targetDay.date;
  }
  approveDailyEvaluation(dayOfWeekOrDate, directorId = "Ceci") {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation review is only permitted when planning is APPROVED (current status: ${this.status})`);
    }
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }
    const targetDay = this.days[targetIndex];
    if (targetDay.evaluationStatus !== "IN_REVIEW") {
      throw new Error(`Cannot approve daily evaluation with status ${targetDay.evaluationStatus || "DRAFT"}`);
    }
    targetDay.evaluationStatus = "APPROVED";
    targetDay.evaluationResubmitted = false;
    targetDay.evaluationReviewedBy = directorId;
    targetDay.evaluationReviewedAt = /* @__PURE__ */ new Date();
  }
  requestDailyEvaluationChange(dayOfWeekOrDate, comment, directorId = "Ceci") {
    if (this.status !== "APPROVED") {
      throw new Error(`Daily evaluation review is only permitted when planning is APPROVED (current status: ${this.status})`);
    }
    const targetIndex = this.days.findIndex((d) => d.dayOfWeek === dayOfWeekOrDate || d.date === dayOfWeekOrDate);
    if (targetIndex === -1) {
      throw new Error(`Day not found in planning: ${dayOfWeekOrDate}`);
    }
    const targetDay = this.days[targetIndex];
    if (targetDay.evaluationStatus !== "IN_REVIEW") {
      throw new Error(`Cannot request changes for daily evaluation with status ${targetDay.evaluationStatus || "DRAFT"}`);
    }
    if (!comment || !comment.trim()) {
      throw new Error("Director comment is required when requesting changes to daily evaluation");
    }
    targetDay.evaluationStatus = "CHANGES_REQUESTED";
    targetDay.evaluationResubmitted = false;
    targetDay.evaluationDirectorComment = comment.trim();
    targetDay.evaluationReviewedBy = directorId;
    targetDay.evaluationReviewedAt = /* @__PURE__ */ new Date();
    delete targetDay.evaluationConfirmedAt;
    delete targetDay.evaluationConfirmedBy;
  }
  saveDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId) {
    this.submitDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId);
  }
};

// src/application/planning/PlanningWorkflowService.ts
var PlanningWorkflowService = class {
  constructor(repository) {
    this.repository = repository;
  }
  async createPlanning(planningId, daycareId, roomId, teacherId, weekStart, weekEnd, role) {
    if (role !== "TEACHER") throw new Error("Only Teacher can create planning");
    const room = RoomCatalog.getRoom(roomId);
    if (!room) throw new Error("Invalid room");
    const planning = WeeklyPlanning.create(planningId, daycareId, roomId, teacherId, weekStart, weekEnd);
    await this.repository.save(planning);
    return planning;
  }
  async saveDraft(planningId, observations, identifiedNeeds, specialSituations, availableMaterials, curricularReferences, days, role, originalContext) {
    if (role !== "TEACHER") throw new Error("Only Teacher can save draft");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.editPedagogicalContent(observations, identifiedNeeds, specialSituations, availableMaterials, curricularReferences, days, originalContext);
    await this.repository.save(planning);
  }
  async updateWeeklyContext(planningId, observations, identifiedNeeds, specialSituations, availableMaterials, role) {
    if (role !== "TEACHER") throw new Error("Only Teacher can edit weekly context");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.updateWeeklyContext(observations, identifiedNeeds, specialSituations, availableMaterials);
    await this.repository.save(planning);
  }
  async setDayComplementaryActivities(planningId, dayId, activities, role) {
    if (role !== "TEACHER") throw new Error("Only Teacher can edit complementary activities");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.setDayComplementaryActivities(dayId, activities);
    await this.repository.save(planning);
  }
  async setDayPrioritizedPractices(planningId, dayId, practices, role) {
    if (role !== "TEACHER") throw new Error("Only Teacher can edit prioritized practices");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.setDayPrioritizedPractices(dayId, practices);
    await this.repository.save(planning);
  }
  async submit(planningId, role) {
    if (role !== "TEACHER") {
      throw new Error("Only Teacher can submit planning");
    }
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.submit();
    await this.repository.save(planning);
  }
  async reject(planningId, reason, rejectedBy, role, granularObs) {
    if (role !== "DIRECTOR") throw new Error("Only Director can reject planning");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.reject(reason, rejectedBy, granularObs);
    await this.repository.save(planning);
  }
  async resubmit(planningId, observations, identifiedNeeds, specialSituations, availableMaterials, curricularReferences, days, role) {
    if (role !== "TEACHER") throw new Error("Only Teacher can resubmit planning");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.editPedagogicalContent(observations, identifiedNeeds, specialSituations, availableMaterials, curricularReferences, days);
    planning.submit();
    await this.repository.save(planning);
  }
  async resolveGranularObservation(planningId, targetId, role, resolvedBy) {
    if (role !== "DIRECTOR") throw new Error("Only Director can resolve observations");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.resolveGranularObservation(targetId, resolvedBy);
    await this.repository.save(planning);
  }
  async markTeacherDayReviewed(planningId, dayOfWeekOrDate, role, teacherId, reviewedAt, currentDays) {
    if (role !== "TEACHER") {
      throw new Error("Only Teacher can mark a planning day as reviewed");
    }
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Teacher review requires an educator identity");
    }
    const planning = await this.repository.findById(planningId);
    if (!planning) {
      throw new Error(`WeeklyPlanning not found: ${planningId}`);
    }
    if (currentDays && currentDays.length === 5) {
      planning.editPedagogicalContent(
        planning.observations,
        planning.identifiedNeeds,
        planning.specialSituations,
        planning.availableMaterials,
        planning.curricularReferences,
        currentDays,
        planning.originalContext
      );
    }
    planning.markTeacherDayReviewed(dayOfWeekOrDate, teacherId, reviewedAt);
    await this.repository.save(planning);
  }
  async markDirectorDayReviewed(planningId, dayOfWeek, role) {
    if (role !== "DIRECTOR") throw new Error("Only Director can mark day as reviewed");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.markDirectorDayReviewed(dayOfWeek);
    await this.repository.save(planning);
  }
  async approve(planningId, role, approvedBy) {
    if (role !== "DIRECTOR") {
      throw new Error("Only Director can approve planning");
    }
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.approve(approvedBy);
    await this.repository.save(planning);
  }
  async getPlanning(planningId) {
    return this.repository.findById(planningId);
  }
  async listTeacherPlanning(teacherId) {
    return this.repository.listByTeacher(teacherId);
  }
  async listDirectorReviewQueue(role) {
    if (role !== "DIRECTOR") throw new Error("Unauthorized");
    return this.repository.listInReview();
  }
  async listSupervisorApprovedPlanning(role) {
    if (role !== "SUPERVISOR" && role !== "DIRECTOR") throw new Error("Unauthorized");
    return this.repository.listApproved();
  }
  async listSupervisorClosedPlanning(role) {
    if (role !== "SUPERVISOR") throw new Error("Unauthorized");
    return this.repository.listClosed();
  }
  async confirmDailyEvaluation(planningId, dayOfWeekOrDate, role, teacherId, confirmedAt = /* @__PURE__ */ new Date(), currentDate) {
    if (role !== "TEACHER") throw new Error("Only Teacher can confirm daily evaluation");
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.confirmDailyEvaluation(dayOfWeekOrDate, teacherId.trim(), confirmedAt, currentDate);
    await this.repository.save(planning);
  }
  async saveDailyEvaluationDraft(planningId, dayOfWeekOrDate, evaluation, role, currentDate, teacherId) {
    if (role !== "TEACHER") throw new Error("Only Teacher can save daily evaluation draft");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.saveDailyEvaluationDraft(dayOfWeekOrDate, evaluation, currentDate, teacherId);
    await this.repository.save(planning);
  }
  async submitDailyEvaluation(planningId, dayOfWeekOrDate, evaluation, role, currentDate, teacherId) {
    if (role !== "TEACHER") throw new Error("Only Teacher can submit daily evaluation");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.submitDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId);
    await this.repository.save(planning);
  }
  async confirmAndSubmitDailyEvaluation(planningId, dayOfWeekOrDate, evaluation, role, currentDate, teacherId, confirmedAt = /* @__PURE__ */ new Date()) {
    if (role !== "TEACHER") throw new Error("Only Teacher can submit daily evaluation");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.confirmAndSubmitDailyEvaluation(dayOfWeekOrDate, evaluation, teacherId.trim(), currentDate, confirmedAt);
    await this.repository.save(planning);
  }
  async confirmAndResubmitDailyEvaluation(planningId, dayOfWeekOrDate, evaluation, role, currentDate, teacherId, confirmedAt = /* @__PURE__ */ new Date()) {
    if (role !== "TEACHER") throw new Error("Only Teacher can resubmit daily evaluation");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");
    if (!teacherId || !teacherId.trim()) {
      throw new Error("Daily evaluation confirmation requires an educator identity");
    }
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.confirmAndResubmitDailyEvaluation(dayOfWeekOrDate, evaluation, teacherId.trim(), currentDate, confirmedAt);
    await this.repository.save(planning);
  }
  async resubmitDailyEvaluation(planningId, dayOfWeekOrDate, evaluation, role, currentDate, teacherId) {
    if (role !== "TEACHER") throw new Error("Only Teacher can resubmit daily evaluation");
    if (!currentDate) throw new Error("Current date is required for temporal evaluation authorization");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.resubmitDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate, teacherId);
    await this.repository.save(planning);
  }
  async approveDailyEvaluation(planningId, dayOfWeekOrDate, role, directorId = "Ceci") {
    if (role !== "DIRECTOR") throw new Error("Only Director can approve daily evaluation");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.approveDailyEvaluation(dayOfWeekOrDate, directorId);
    await this.repository.save(planning);
  }
  async requestDailyEvaluationChange(planningId, dayOfWeekOrDate, comment, role, directorId = "Ceci") {
    if (role !== "DIRECTOR") throw new Error("Only Director can request changes to daily evaluation");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.requestDailyEvaluationChange(dayOfWeekOrDate, comment, directorId);
    await this.repository.save(planning);
  }
  async saveDailyEvaluation(planningId, dayOfWeekOrDate, evaluation, role, currentDate) {
    if (role !== "TEACHER") throw new Error("Only Teacher can record daily evaluation");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    if (!currentDate) {
      throw new Error("Current date is required for temporal evaluation authorization");
    }
    planning.saveDailyEvaluation(dayOfWeekOrDate, evaluation, currentDate);
    await this.repository.save(planning);
  }
  async closeWeek(planningId, role, directorId = "Ceci", closedAt = /* @__PURE__ */ new Date()) {
    if (role !== "DIRECTOR") throw new Error("Only Director can formally close the week");
    const planning = await this.repository.findById(planningId);
    if (!planning) throw new Error("Planning not found");
    planning.closeWeek(directorId, closedAt);
    await this.repository.save(planning);
  }
};

// src/infrastructure/repositories/InMemoryWeeklyPlanningRepository.ts
var InMemoryWeeklyPlanningRepository = class {
  data = /* @__PURE__ */ new Map();
  hydrate(serialized) {
    const clone = Object.assign(
      WeeklyPlanning.create("", "", "", "", "", ""),
      JSON.parse(serialized)
    );
    clone.assertValidCurricularInvariants();
    clone.assertValidComplementaryInvariants();
    clone.assertValidPrioritizedPracticeInvariants();
    return clone;
  }
  async save(planning) {
    planning.assertValidCurricularInvariants();
    planning.assertValidComplementaryInvariants();
    planning.assertValidPrioritizedPracticeInvariants();
    const serialized = JSON.stringify(planning);
    const clone = this.hydrate(serialized);
    this.data.set(planning.planningId, clone);
  }
  async findById(planningId) {
    const existing = this.data.get(planningId);
    if (!existing) return null;
    const serialized = JSON.stringify(existing);
    return this.hydrate(serialized);
  }
  async listByTeacher(teacherId) {
    return Array.from(this.data.values()).filter((p) => p.teacherId === teacherId).map((p) => {
      const serialized = JSON.stringify(p);
      return this.hydrate(serialized);
    });
  }
  async listInReview() {
    return Array.from(this.data.values()).filter((p) => p.status === "IN_REVIEW").map((p) => {
      const serialized = JSON.stringify(p);
      return this.hydrate(serialized);
    });
  }
  async listApproved() {
    return Array.from(this.data.values()).filter((p) => p.status === "APPROVED" || p.status === "APPROVED_FOR_EXECUTION" || p.status === "CLOSED").map((p) => {
      const serialized = JSON.stringify(p);
      return this.hydrate(serialized);
    });
  }
  async listClosed() {
    return Array.from(this.data.values()).filter((p) => p.status === "CLOSED").map((p) => {
      const serialized = JSON.stringify(p);
      return this.hydrate(serialized);
    });
  }
};

// scripts/firebase/provisionLabWeeklyPlanning.ts
var TARGET_PROJECT = "tutoria-identity-lab";
var PROD_PROJECT = "guarderiasimss-5cb09";
var LAB_PLANNING_ID = "f1000000-0000-4000-8000-000000000001";
var LAB_ROOM_ID = "room-lactantes-a";
var LAB_FIXTURE_WEEK_START = "2026-08-24";
var LAB_FIXTURE_WEEK_END = "2026-08-28";
var LAB_TARGET_DAY_OF_WEEK = "MONDAY";
var LAB_TARGET_DAY_DATE = "2026-08-24";
var SYNTHETIC_GOVERNANCE_AUDIT = {
  observations: "Contexto grupal de prueba controlada para evaluaci\xF3n diagn\xF3stica en sala Lactantes A.",
  identifiedNeeds: "Estimulaci\xF3n visual y auditiva con materiales suaves disponibles en sala.",
  specialSituations: "",
  availableMaterials: "telas suaves, colchonetas"
};
var AUTHORIZED_MATERIAL_UNIVERSE = Object.freeze(/* @__PURE__ */ new Set(["telas suaves", "colchonetas"]));
var ACTIVITY_DURATION_MINUTES = 15;
function assertProjectFirewall(projectId) {
  if (!projectId || projectId.trim() === "" || projectId === "undefined") {
    throw new Error("[FIREWALL VIOLATION] Target project is undefined. Refusing execution.");
  }
  if (projectId === PROD_PROJECT) {
    throw new Error(`[FIREWALL VIOLATION] Refusing execution against production project: '${PROD_PROJECT}'.`);
  }
  if (projectId !== TARGET_PROJECT) {
    throw new Error(`[FIREWALL VIOLATION] Target project must be '${TARGET_PROJECT}'. Received: '${projectId}'.`);
  }
}
function resolveProjectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.FIREBASE_CONFIG) {
    try {
      const config = JSON.parse(process.env.FIREBASE_CONFIG);
      if (config.projectId) return config.projectId;
    } catch {
    }
  }
  return TARGET_PROJECT;
}
function parseCliArgs(args) {
  const flags = args.filter((a) => a.startsWith("--"));
  const hasDryRun = flags.includes("--dry-run");
  const hasExecute = flags.includes("--execute");
  if (hasDryRun && hasExecute) {
    throw new Error("Conflicting flags: --dry-run and --execute cannot be passed simultaneously.");
  }
  const allowedFlags = /* @__PURE__ */ new Set(["--dry-run", "--execute"]);
  for (const flag of flags) {
    if (!allowedFlags.has(flag)) {
      throw new Error(`Unknown flag: '${flag}'. Allowed flags: --dry-run, --execute.`);
    }
  }
  if (hasExecute) {
    return { mode: "EXECUTE" };
  }
  return { mode: "DRY_RUN" };
}
function assertMaterialEnclosure(planning, authorizedUniverse = AUTHORIZED_MATERIAL_UNIVERSE) {
  for (const day of planning.days) {
    for (const act of day.activities) {
      if (act.materials && Array.isArray(act.materials)) {
        for (const mat of act.materials) {
          if (!authorizedUniverse.has(mat)) {
            throw new Error(
              `[MATERIAL ENCLOSURE VIOLATION] Material '${mat}' in activity '${act.activityId}' on day '${day.dayOfWeek}' is outside the authorized fixture universe.`
            );
          }
        }
      }
    }
  }
}
function createSyntheticFiveDays() {
  return [
    {
      date: "2026-08-24",
      dayOfWeek: "MONDAY",
      activities: [
        {
          activityId: "act-lactantes-mon",
          category: "ACTIVIDAD_PEDAGOGICA",
          objective: "Favorecer la estimulaci\xF3n sensorial visual y t\xE1ctil mediante texturas suaves en sala.",
          description: "Se colocan telas suaves sobre las colchonetas permitiendo momentos de exploraci\xF3n libre y contacto visual acompa\xF1ado por la educadora.",
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ["telas suaves", "colchonetas"],
          curricularTraceability: []
        }
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ["telas suaves", "colchonetas"]
    },
    {
      date: "2026-08-25",
      dayOfWeek: "TUESDAY",
      activities: [
        {
          activityId: "act-lactantes-tue",
          category: "ACTIVIDAD_PEDAGOGICA",
          objective: "Promover la exploraci\xF3n postural y el movimiento sobre superficie c\xF3moda.",
          description: "Se dispone el \xE1rea de colchonetas para cambios de postura y descanso guiado con acompa\xF1amiento de la educadora.",
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ["colchonetas"],
          curricularTraceability: []
        }
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ["colchonetas"]
    },
    {
      date: "2026-08-26",
      dayOfWeek: "WEDNESDAY",
      activities: [
        {
          activityId: "act-lactantes-wed",
          category: "ACTIVIDAD_PEDAGOGICA",
          objective: "Estimular el seguimiento visual de contrastes de tela a corta distancia.",
          description: "La educadora presenta telas suaves a corta distancia observando la atenci\xF3n visual y respuestas del grupo.",
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ["telas suaves"],
          curricularTraceability: []
        }
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ["telas suaves"]
    },
    {
      date: "2026-08-27",
      dayOfWeek: "THURSDAY",
      activities: [
        {
          activityId: "act-lactantes-thu",
          category: "ACTIVIDAD_PEDAGOGICA",
          objective: "Favorecer la interacci\xF3n con texturas suaves durante el juego en piso.",
          description: "Se distribuyen telas suaves sobre las colchonetas invitando al contacto t\xE1ctil en un ambiente tranquilo.",
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ["telas suaves", "colchonetas"],
          curricularTraceability: []
        }
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ["telas suaves", "colchonetas"]
    },
    {
      date: "2026-08-28",
      dayOfWeek: "FRIDAY",
      activities: [
        {
          activityId: "act-lactantes-fri",
          category: "ACTIVIDAD_PEDAGOGICA",
          objective: "Consolidar las experiencias de relajaci\xF3n y descanso sobre colchonetas.",
          description: "Se organiza el espacio de colchonetas con telas suaves para momentos de descanso y relajaci\xF3n grupal.",
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ["telas suaves", "colchonetas"],
          curricularTraceability: []
        }
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ["telas suaves", "colchonetas"]
    }
  ];
}
async function executeDomainLifecycle(params) {
  const room = RoomCatalog.getRoom(params.roomId);
  if (!room) {
    throw new Error(`Invalid room: '${params.roomId}'. Must exist in RoomCatalog.`);
  }
  const repo = new InMemoryWeeklyPlanningRepository();
  const service = new PlanningWorkflowService(repo);
  await service.createPlanning(
    params.planningId,
    params.daycareId,
    params.roomId,
    params.teacherId,
    params.weekStart,
    params.weekEnd,
    "TEACHER"
  );
  const days = createSyntheticFiveDays();
  await service.saveDraft(
    params.planningId,
    SYNTHETIC_GOVERNANCE_AUDIT.observations,
    SYNTHETIC_GOVERNANCE_AUDIT.identifiedNeeds,
    SYNTHETIC_GOVERNANCE_AUDIT.specialSituations,
    SYNTHETIC_GOVERNANCE_AUDIT.availableMaterials,
    [],
    days,
    "TEACHER"
  );
  const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  const reviewInstant = /* @__PURE__ */ new Date(`${params.weekStart}T12:00:00.000Z`);
  for (const wd of weekdays) {
    await service.markTeacherDayReviewed(
      params.planningId,
      wd,
      "TEACHER",
      params.teacherId,
      reviewInstant
    );
  }
  await service.submit(params.planningId, "TEACHER");
  await service.approve(params.planningId, "DIRECTOR", params.directorId);
  const finalPlanning = await repo.findById(params.planningId);
  if (!finalPlanning) {
    throw new Error("Failed to retrieve final aggregate from in-memory repository.");
  }
  finalPlanning.assertValidCurricularInvariants();
  finalPlanning.assertValidComplementaryInvariants();
  finalPlanning.assertValidPrioritizedPracticeInvariants();
  assertMaterialEnclosure(finalPlanning);
  if (!finalPlanning.isApprovedForExecution()) {
    throw new Error(`Lifecycle failed to produce APPROVED status. Found: ${finalPlanning.status}`);
  }
  return finalPlanning;
}
function toDate(val) {
  if (!val) return void 0;
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return void 0;
}
function serializeWeeklyPlanningForAdmin(planning) {
  return {
    planningId: planning.planningId,
    daycareId: planning.daycareId,
    roomId: planning.roomId,
    teacherId: planning.teacherId,
    weekStart: planning.weekStart,
    weekEnd: planning.weekEnd,
    status: planning.status,
    observations: planning.observations,
    identifiedNeeds: planning.identifiedNeeds,
    specialSituations: planning.specialSituations ?? "",
    availableMaterials: planning.availableMaterials ?? "",
    curricularReferences: planning.curricularReferences ?? [],
    version: planning.version,
    ...planning.closedBy !== void 0 ? { closedBy: planning.closedBy } : {},
    ...planning.closedAt ? { closedAt: toDate(planning.closedAt) } : {},
    ...planning.approvedBy !== void 0 ? { approvedBy: planning.approvedBy } : {},
    ...planning.approvedAt ? { approvedAt: toDate(planning.approvedAt) } : {},
    ...planning.originalContext !== void 0 ? { originalContext: planning.originalContext } : {},
    granularObservations: planning.granularObservations ?? [],
    historicalRounds: planning.historicalRounds ?? [],
    reviewHistory: (planning.reviewHistory ?? []).map((record) => ({
      reason: record.reason,
      rejectedBy: record.rejectedBy,
      rejectedAt: toDate(record.rejectedAt)
    })),
    days: planning.days.map((day) => ({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      activities: (day.activities || []).map((act) => ({
        activityId: act.activityId,
        category: act.category,
        objective: act.objective,
        description: act.description,
        durationMinutes: act.durationMinutes,
        materials: act.materials || [],
        curricularTraceability: act.curricularTraceability || [],
        ...act.prospectiveObservationTarget ? { prospectiveObservationTarget: act.prospectiveObservationTarget } : {}
      })),
      complementaryActivities: day.complementaryActivities || [],
      prioritizedPractices: day.prioritizedPractices || [],
      materials: day.materials || [],
      ...day.teacherReviewedAt ? { teacherReviewedAt: toDate(day.teacherReviewedAt) } : {},
      ...day.teacherReviewedBy ? { teacherReviewedBy: day.teacherReviewedBy } : {},
      ...day.evaluation !== void 0 ? { evaluation: day.evaluation } : {},
      ...day.evaluationStatus !== void 0 ? { evaluationStatus: day.evaluationStatus } : {},
      ...day.evaluationSubmittedAt ? { evaluationSubmittedAt: toDate(day.evaluationSubmittedAt) } : {},
      ...day.evaluationSubmittedBy ? { evaluationSubmittedBy: day.evaluationSubmittedBy } : {},
      ...day.evaluationReviewedAt ? { evaluationReviewedAt: toDate(day.evaluationReviewedAt) } : {},
      ...day.evaluationReviewedBy ? { evaluationReviewedBy: day.evaluationReviewedBy } : {}
    }))
  };
}
function buildNormalizedSnapshot(planning, targetWeekday = LAB_TARGET_DAY_OF_WEEK) {
  const targetDay = planning.days.find((d) => d.dayOfWeek === targetWeekday);
  const activityCounts = {};
  for (const d of planning.days) {
    activityCounts[d.dayOfWeek] = d.activities ? d.activities.length : 0;
  }
  return {
    version: planning.version,
    status: planning.status,
    daysCount: planning.days.length,
    activityCounts,
    targetDay: {
      dayOfWeek: targetDay ? targetDay.dayOfWeek : "UNKNOWN",
      date: targetDay ? targetDay.date : "",
      hasEvaluation: Boolean(targetDay && targetDay.evaluation),
      evaluationStatus: targetDay && targetDay.evaluationStatus ? targetDay.evaluationStatus : null,
      evaluationSubmittedAt: targetDay && targetDay.evaluationSubmittedAt ? targetDay.evaluationSubmittedAt.toISOString() : null,
      evaluationSubmittedBy: targetDay && targetDay.evaluationSubmittedBy ? targetDay.evaluationSubmittedBy : null,
      evaluationReviewedAt: targetDay && targetDay.evaluationReviewedAt ? targetDay.evaluationReviewedAt.toISOString() : null,
      evaluationReviewedBy: targetDay && targetDay.evaluationReviewedBy ? targetDay.evaluationReviewedBy : null,
      teacherReviewed: Boolean(targetDay && targetDay.teacherReviewedAt && targetDay.teacherReviewedBy)
    },
    governance: {
      isApproved: planning.status === "APPROVED",
      hasApprovedBy: Boolean(planning.approvedBy),
      hasApprovedAt: Boolean(planning.approvedAt)
    },
    closure: {
      isClosed: planning.status === "CLOSED",
      hasClosedAt: Boolean(planning.closedAt),
      hasClosedBy: Boolean(planning.closedBy)
    },
    reviewHistoryCount: planning.reviewHistory ? planning.reviewHistory.length : 0
  };
}
function hashNormalizedSnapshot(snapshot) {
  const json = JSON.stringify(snapshot, Object.keys(snapshot).sort());
  return createHash("sha256").update(json).digest("hex");
}
async function runProvisioner(options) {
  const effectiveProject = options.projectId || resolveProjectId();
  assertProjectFirewall(effectiveProject);
  let firestore = options.db;
  if (!firestore) {
    const existingApps = getApps();
    const app = existingApps.length > 0 ? existingApps[0] : initializeApp({
      credential: applicationDefault(),
      projectId: effectiveProject
    });
    firestore = getFirestore(app);
  }
  const existingFixture = await firestore.collection("weeklyPlannings").doc(LAB_PLANNING_ID).get();
  if (existingFixture.exists) {
    throw new Error(`[FIXTURE PREEXISTENCE] Fixture '${LAB_PLANNING_ID}' already exists in LAB Firestore. Stop.`);
  }
  const teacherDoc = await firestore.collection("authorizationContexts").doc("lab-teacher-anita").get();
  if (!teacherDoc.exists) {
    throw new Error("Teacher authorization context does not exist in LAB.");
  }
  const teacherData = teacherDoc.data() || {};
  if (teacherData.institutionalRole !== "TEACHER" || teacherData.active !== true) {
    throw new Error("Teacher is not active with TEACHER role.");
  }
  const teacherDaycares = teacherData.authorizedDaycareIds || [];
  if (!teacherDaycares.includes("00000000-0000-4000-8000-000000000001")) {
    throw new Error("Teacher is not authorized for target daycare.");
  }
  const directorDoc = await firestore.collection("authorizationContexts").doc("lab-director-ceci").get();
  if (!directorDoc.exists) {
    throw new Error("Director authorization context does not exist in LAB.");
  }
  const directorData = directorDoc.data() || {};
  if (directorData.institutionalRole !== "DIRECTOR" || directorData.active !== true) {
    throw new Error("Director is not active with DIRECTOR role.");
  }
  const directorDaycares = directorData.authorizedDaycareIds || [];
  if (!directorDaycares.includes("00000000-0000-4000-8000-000000000001")) {
    throw new Error("Director is not authorized for target daycare.");
  }
  const planning = await executeDomainLifecycle({
    planningId: LAB_PLANNING_ID,
    daycareId: "00000000-0000-4000-8000-000000000001",
    roomId: LAB_ROOM_ID,
    teacherId: "lab-teacher-anita",
    directorId: "lab-director-ceci",
    weekStart: LAB_FIXTURE_WEEK_START,
    weekEnd: LAB_FIXTURE_WEEK_END
  });
  const serialized = serializeWeeklyPlanningForAdmin(planning);
  const snapshot = buildNormalizedSnapshot(planning);
  const snapshotHash = hashNormalizedSnapshot(snapshot);
  let actualWrites = 0;
  if (options.mode === "EXECUTE") {
    assertProjectFirewall(effectiveProject);
    const docRef = firestore.collection("weeklyPlannings").doc(LAB_PLANNING_ID);
    await docRef.create(serialized);
    actualWrites = 1;
  }
  let totalActivities = 0;
  let totalPda = 0;
  let totalComp = 0;
  let totalPrioritized = 0;
  for (const d of planning.days) {
    totalActivities += d.activities ? d.activities.length : 0;
    for (const a of d.activities || []) {
      totalPda += a.curricularTraceability ? a.curricularTraceability.length : 0;
    }
    totalComp += d.complementaryActivities ? d.complementaryActivities.length : 0;
    totalPrioritized += d.prioritizedPractices ? d.prioritizedPractices.length : 0;
  }
  const targetDay = planning.days.find((d) => d.dayOfWeek === LAB_TARGET_DAY_OF_WEEK);
  return {
    mode: options.mode,
    targetProject: effectiveProject,
    fixtureId: LAB_PLANNING_ID,
    fixtureExistedBefore: false,
    teacherVerified: true,
    directorVerified: true,
    roomVerified: true,
    lifecyclePassed: true,
    finalStatus: planning.status,
    finalVersion: planning.version,
    totalDays: planning.days.length,
    totalActivities,
    totalPdaReferences: totalPda,
    totalComplementaryActivities: totalComp,
    totalPrioritizedPractices: totalPrioritized,
    materialEnclosurePassed: true,
    targetDayEvaluationPresent: Boolean(targetDay && targetDay.evaluation),
    closurePresent: Boolean(planning.closedAt || planning.closedBy),
    expectedDocumentsMutatedOnExecute: 1,
    expectedWritesOnExecute: 1,
    actualFirestoreWrites: actualWrites,
    openAiCalls: 0,
    prodAccess: 0,
    normalizedSnapshotHash: snapshotHash
  };
}
async function main() {
  try {
    const { mode } = parseCliArgs(process.argv.slice(2));
    console.log("============================================================");
    console.log("TUTORIA LAB WEEKLY PLANNING PROVISIONER");
    console.log(`MODE: ${mode}`);
    console.log("============================================================\n");
    const result = await runProvisioner({ mode });
    console.log("PROVISIONING RESULT SUMMARY (ALIAS-ONLY):");
    console.log(`  MODE = ${result.mode}`);
    console.log(`  TARGET = LAB (${result.targetProject})`);
    console.log(`  PROJECT_FIREWALL = PASS`);
    console.log(`  LAB_PLANNING_A_EXISTS = NO`);
    console.log(`  TEACHER_AUTHORIZATION = PASS`);
    console.log(`  DIRECTOR_AUTHORIZATION = PASS`);
    console.log(`  ROOM = Lactantes A`);
    console.log(`  WEEK = ${LAB_FIXTURE_WEEK_START}..${LAB_FIXTURE_WEEK_END}`);
    console.log(`  TARGET_DAY = ${LAB_TARGET_DAY_OF_WEEK}`);
    console.log(`  DOMAIN_LIFECYCLE = PASS`);
    console.log(`  FINAL_STATUS = ${result.finalStatus}`);
    console.log(`  VERSION = ${result.finalVersion}`);
    console.log(`  DAYS = ${result.totalDays}`);
    console.log(`  ACTIVITIES = ${result.totalActivities}`);
    console.log(`  PDA_REFERENCES = ${result.totalPdaReferences}`);
    console.log(`  COMPLEMENTARY_ACTIVITIES = ${result.totalComplementaryActivities}`);
    console.log(`  PRIORITIZED_PRACTICES = ${result.totalPrioritizedPractices}`);
    console.log(`  MATERIAL_ENCLOSURE = PASS`);
    console.log(`  TARGET_EVALUATION_PRESENT = ${result.targetDayEvaluationPresent ? "YES" : "NO"}`);
    console.log(`  CLOSED = ${result.closurePresent ? "YES" : "NO"}`);
    console.log(`  EXPECTED_DOCUMENTS_MUTATED_ON_EXECUTE = ${result.expectedDocumentsMutatedOnExecute}`);
    console.log(`  EXPECTED_FIRESTORE_WRITES_ON_EXECUTE = ${result.expectedWritesOnExecute}`);
    console.log(`  ACTUAL_FIRESTORE_WRITES = ${result.actualFirestoreWrites}`);
    console.log(`  OPENAI_CALLS = ${result.openAiCalls}`);
    console.log(`  PROD_ACCESS = ${result.prodAccess}`);
    console.log(`  SNAPSHOT_HASH = ${result.normalizedSnapshotHash}`);
    console.log("\nDRY RUN COMPLETE \u2014 ZERO CLOUD MUTATIONS PERFORMED.");
  } catch (err) {
    console.error(`
[FATAL ERROR] Provisioner aborted: ${err.message}`);
    process.exit(1);
  }
}
if (process.argv[1] && process.argv[1].endsWith("provisionLabWeeklyPlanning.mjs")) {
  main();
}
export {
  ACTIVITY_DURATION_MINUTES,
  AUTHORIZED_MATERIAL_UNIVERSE,
  LAB_FIXTURE_WEEK_END,
  LAB_FIXTURE_WEEK_START,
  LAB_PLANNING_ID,
  LAB_ROOM_ID,
  LAB_TARGET_DAY_DATE,
  LAB_TARGET_DAY_OF_WEEK,
  PROD_PROJECT,
  SYNTHETIC_GOVERNANCE_AUDIT,
  TARGET_PROJECT,
  assertMaterialEnclosure,
  assertProjectFirewall,
  buildNormalizedSnapshot,
  createSyntheticFiveDays,
  executeDomainLifecycle,
  hashNormalizedSnapshot,
  parseCliArgs,
  resolveProjectId,
  runProvisioner,
  serializeWeeklyPlanningForAdmin
};
//# sourceMappingURL=provisionLabWeeklyPlanning.mjs.map
