/**
 * DIRECT CANONICAL 40-PDA CATALOG FOUNDATION
 *
 * Source: IMSS Form 3D11-009-003, Sheet Anexo5_Planeación Reverso (2)
 *
 * This catalog represents the immutable TutorIA internal canonical representation
 * of the 40 Procesos de Desarrollo de Aprendizaje (PDA) matrix for Prestación Directa.
 *
 * Internal identities (TUTORIA-PDA-0001 .. TUTORIA-PDA-0040) are TutorIA technical
 * identifiers and NOT institutional codes.
 */

export const TUTORIA_DIRECT_PDA_CATALOG_REVISION = 'TUTORIA-DIRECT-PDA-CATALOG-R1' as const;

export interface DirectPDAProvenance {
  readonly sourceFormCode: '3D11-009-003';
  readonly sourceSheet: 'Anexo5_Planeación Reverso (2)';
  readonly contenidoRange: string;
  readonly pdaCell: string;
  readonly enLaPlaneacionCell: string;
}

export interface DirectPDAEntry {
  readonly id: string;
  readonly campoFormativo: string;
  readonly contenido: string;
  readonly pda: string;
  readonly provenance: DirectPDAProvenance;
}

export const DIRECT_PDA_CATALOG: readonly DirectPDAEntry[] = Object.freeze([
  {
  "id": "TUTORIA-PDA-0001",
  "campoFormativo": "Lenguajes",
  "contenido": "Las diferentes formas de los lenguajes para la expresión de necesidades, intereses, emociones, afectos y sentimientos. ",
  "pda": "Construye vínculos afectivos a través de los diferentes lenguajes, verbales y no verbales.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B6:B8",
    "pdaCell": "C6",
    "enLaPlaneacionCell": "D6"
  }
},
  {
  "id": "TUTORIA-PDA-0002",
  "campoFormativo": "Lenguajes",
  "contenido": "Las diferentes formas de los lenguajes para la expresión de necesidades, intereses, emociones, afectos y sentimientos. ",
  "pda": "Utiliza diversas estructuras del lenguaje oral: el maternés, el balbuceo, los juegos metalingüísticos y las narraciones, para la expresión lingüística.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B6:B8",
    "pdaCell": "C7",
    "enLaPlaneacionCell": "D7"
  }
},
  {
  "id": "TUTORIA-PDA-0003",
  "campoFormativo": "Lenguajes",
  "contenido": "Las diferentes formas de los lenguajes para la expresión de necesidades, intereses, emociones, afectos y sentimientos. ",
  "pda": "Experimenta la lengua de relato cotidianamente, favoreciendo la capacidad de imaginar, de organizar el tiempo, de reflejarse en los cuentos y poemas y de aprender a narrar.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B6:B8",
    "pdaCell": "C8",
    "enLaPlaneacionCell": "D8"
  }
},
  {
  "id": "TUTORIA-PDA-0004",
  "campoFormativo": "Lenguajes",
  "contenido": "La identidad familiar y comunitaria que aporta la riqueza cultural de las lenguas maternas (español, indígenas o extranjeras) en contextos de diversidad para fortalecer su uso en niñas y niños. ",
  "pda": "Usa cotidianamente la lengua materna con apoyo de sus familiares de crianza, identificándose como parte de su comunidad.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B9:B10",
    "pdaCell": "C9",
    "enLaPlaneacionCell": "D9"
  }
},
  {
  "id": "TUTORIA-PDA-0005",
  "campoFormativo": "Lenguajes",
  "contenido": "La identidad familiar y comunitaria que aporta la riqueza cultural de las lenguas maternas (español, indígenas o extranjeras) en contextos de diversidad para fortalecer su uso en niñas y niños. ",
  "pda": "Disfruta de la belleza sonora que le aportan las nanas, “canciones para llamar al sueño” o canciones de cuna.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B9:B10",
    "pdaCell": "C10",
    "enLaPlaneacionCell": "D10"
  }
},
  {
  "id": "TUTORIA-PDA-0006",
  "campoFormativo": "Lenguajes",
  "contenido": "El encuentro creador de niñas y niños consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias artísticas. ",
  "pda": "Experimenta y transforma el espacio a través del arte y el juego, en forma colectiva.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B11:B16",
    "pdaCell": "C11",
    "enLaPlaneacionCell": "D11"
  }
},
  {
  "id": "TUTORIA-PDA-0007",
  "campoFormativo": "Lenguajes",
  "contenido": "El encuentro creador de niñas y niños consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias artísticas. ",
  "pda": "Encuentra formas de dejar sus huellas gráficas en el espacio y experimenta con distintos materiales, a partir de las artes plásticas y visuales.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B11:B16",
    "pdaCell": "C12",
    "enLaPlaneacionCell": "D12"
  }
},
  {
  "id": "TUTORIA-PDA-0008",
  "campoFormativo": "Lenguajes",
  "contenido": "El encuentro creador de niñas y niños consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias artísticas. ",
  "pda": "Escucha, canta y habla haciendo uso de experiencias musicales, disfrutando su envoltura sonora.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B11:B16",
    "pdaCell": "C13",
    "enLaPlaneacionCell": "D13"
  }
},
  {
  "id": "TUTORIA-PDA-0009",
  "campoFormativo": "Lenguajes",
  "contenido": "El encuentro creador de niñas y niños consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias artísticas. ",
  "pda": "Descubre el movimiento estético y la representación, al participar en experiencias de expresión corporal propias.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B11:B16",
    "pdaCell": "C14",
    "enLaPlaneacionCell": "D14"
  }
},
  {
  "id": "TUTORIA-PDA-0010",
  "campoFormativo": "Lenguajes",
  "contenido": "El encuentro creador de niñas y niños consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias artísticas. ",
  "pda": "Disfruta la lectura como una experiencia que alimenta su curiosidad y capacidad creadora tanto en la familia como en el servicio educativo.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B11:B16",
    "pdaCell": "C15",
    "enLaPlaneacionCell": "D15"
  }
},
  {
  "id": "TUTORIA-PDA-0011",
  "campoFormativo": "Lenguajes",
  "contenido": "El encuentro creador de niñas y niños consigo mismas, consigo mismos, y con el mundo, por medio del disfrute de las experiencias artísticas. ",
  "pda": "Experimenta diversos roles, como espectadora, espectador y participante en narrativas teatrales.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B11:B16",
    "pdaCell": "C16",
    "enLaPlaneacionCell": "D16"
  }
},
  {
  "id": "TUTORIA-PDA-0012",
  "campoFormativo": "Saberes y Pensamiento Científico",
  "contenido": "El juego como base de la experiencia de investigación para que niñas y niños construyan sentido del mundo, de sí mismas y de sí mismos.",
  "pda": "Desarrolla contenidos simbólicos que se ponen en marcha a través de las experiencias lúdicas, para hacer crecer la capacidad de imaginación, la fantasía y el pensamiento.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B19:B22",
    "pdaCell": "C19",
    "enLaPlaneacionCell": "D19"
  }
},
  {
  "id": "TUTORIA-PDA-0013",
  "campoFormativo": "Saberes y Pensamiento Científico",
  "contenido": "El juego como base de la experiencia de investigación para que niñas y niños construyan sentido del mundo, de sí mismas y de sí mismos.",
  "pda": "Juega y se expresa artísticamente, con autonomía a partir de sus propios imaginarios, para favorecer el crecimiento de su “espacio potencial”, como lugar del juego, de la cultura y el arte.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B19:B22",
    "pdaCell": "C20",
    "enLaPlaneacionCell": "D20"
  }
},
  {
  "id": "TUTORIA-PDA-0014",
  "campoFormativo": "Saberes y Pensamiento Científico",
  "contenido": "El juego como base de la experiencia de investigación para que niñas y niños construyan sentido del mundo, de sí mismas y de sí mismos.",
  "pda": "Construye su propio guion, en espacios de juego en libertad, para que a través del encuentro grupal experimente su creación personal y la colectiva, otorgándoles significado.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B19:B22",
    "pdaCell": "C21",
    "enLaPlaneacionCell": "D21"
  }
},
  {
  "id": "TUTORIA-PDA-0015",
  "campoFormativo": "Saberes y Pensamiento Científico",
  "contenido": "El juego como base de la experiencia de investigación para que niñas y niños construyan sentido del mundo, de sí mismas y de sí mismos.",
  "pda": "Reconoce su cuerpo, sus habilidades, el lenguaje y sus posibilidades, las relaciones entre su cuerpo y el de otras y otros, el movimiento y el habla, para hacer crecer el conocimiento de sí misma, de sí mismo, a través de juegos de diversa índole.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B19:B22",
    "pdaCell": "C22",
    "enLaPlaneacionCell": "D22"
  }
},
  {
  "id": "TUTORIA-PDA-0016",
  "campoFormativo": "Saberes y Pensamiento Científico",
  "contenido": "La exploración e investigación del mundo para el desarrollo del pensamiento a través de la curiosidad, los sentidos y la creatividad.",
  "pda": "Descubre las características de los materiales y las manifestaciones de la naturaleza, para discriminar, comparar, establecer relaciones entre\nsus propiedades e imaginar cómo incorporarlos en futuros juegos o actividades.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B23:B24",
    "pdaCell": "C23",
    "enLaPlaneacionCell": "D23"
  }
},
  {
  "id": "TUTORIA-PDA-0017",
  "campoFormativo": "Saberes y Pensamiento Científico",
  "contenido": "La exploración e investigación del mundo para el desarrollo del pensamiento a través de la curiosidad, los sentidos y la creatividad.",
  "pda": "Observa y conversa con otras y otros, para escucharse, socializar y validar los descubrimientos, las hipótesis y las creaciones.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B23:B24",
    "pdaCell": "C24",
    "enLaPlaneacionCell": "D24"
  }
},
  {
  "id": "TUTORIA-PDA-0018",
  "campoFormativo": "Saberes y Pensamiento Científico",
  "contenido": "El aprendizaje de niñas y niños a través de la observación y el involucramiento en la comunidad y el ambiente que les rodea. ",
  "pda": "Incorpora los saberes de su comunidad y genera pertenencia social y cultural, al interactuar con sus figuras de referencia en su contexto.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B25:B26",
    "pdaCell": "C25",
    "enLaPlaneacionCell": "D25"
  }
},
  {
  "id": "TUTORIA-PDA-0019",
  "campoFormativo": "Saberes y Pensamiento Científico",
  "contenido": "El aprendizaje de niñas y niños a través de la observación y el involucramiento en la comunidad y el ambiente que les rodea. ",
  "pda": "Se involucra en propuestas derivadas de contenidos y saberes culturales que observa y le interesan de su comunidad.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B25:B26",
    "pdaCell": "C26",
    "enLaPlaneacionCell": "D26"
  }
},
  {
  "id": "TUTORIA-PDA-0020",
  "campoFormativo": "Ética, Naturaleza y Sociedades",
  "contenido": "El enfoque de derechos como base de la intervención integral con niñas y niños.",
  "pda": "Avanza progresivamente en la agencia de sus derechos identificando su derecho a decidir, a participar, a recibir respuesta a sus necesidades y a ser protegida y protegido de cualquier situación o condición que ponga en riesgo su vida o cualquiera de sus derechos.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B29:B31",
    "pdaCell": "C29",
    "enLaPlaneacionCell": "D29"
  }
},
  {
  "id": "TUTORIA-PDA-0021",
  "campoFormativo": "Ética, Naturaleza y Sociedades",
  "contenido": "El enfoque de derechos como base de la intervención integral con niñas y niños.",
  "pda": "Crea, se expresa y convive en experiencias de juego, decidiendo en libertad su participación y sus formas de expresión.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B29:B31",
    "pdaCell": "C30",
    "enLaPlaneacionCell": "D30"
  }
},
  {
  "id": "TUTORIA-PDA-0022",
  "campoFormativo": "Ética, Naturaleza y Sociedades",
  "contenido": "El enfoque de derechos como base de la intervención integral con niñas y niños.",
  "pda": "Participa y aprende del mundo a través de su proceso creador, su impulso de aprendizaje, reconociendo y expresando las ideas y tomando decisiones sobre el ambiente y las personas.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B29:B31",
    "pdaCell": "C31",
    "enLaPlaneacionCell": "D31"
  }
},
  {
  "id": "TUTORIA-PDA-0023",
  "campoFormativo": "Ética, Naturaleza y Sociedades",
  "contenido": "La corresponsabilidad de las personas adultas frente al cuidado y protección de las niñas y los niños y su papel como garantes derechos.",
  "pda": "Genera confianza y seguridad creciente a partir de sentir protección, amor y seguridad en su entorno.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B32:B33",
    "pdaCell": "C32",
    "enLaPlaneacionCell": "D32"
  }
},
  {
  "id": "TUTORIA-PDA-0024",
  "campoFormativo": "Ética, Naturaleza y Sociedades",
  "contenido": "La corresponsabilidad de las personas adultas frente al cuidado y protección de las niñas y los niños y su papel como garantes derechos.",
  "pda": "Se relaciona con la naturaleza, aprende a cuidar y respetar el medio ambiente y a todos los seres vivos en su ambiente de vida.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B32:B33",
    "pdaCell": "C33",
    "enLaPlaneacionCell": "D33"
  }
},
  {
  "id": "TUTORIA-PDA-0025",
  "campoFormativo": "Ética, Naturaleza y Sociedades",
  "contenido": "La crianza compartida como prolongación de los cuidados amorosos consensuados, capaces de proveer una continuidad cultural.",
  "pda": "Responde con gestos, posturas, balbuceos, palabras y movimientos, a la forma de crianza que le brindan sus figuras de referencia.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B34:B36",
    "pdaCell": "C34",
    "enLaPlaneacionCell": "D34"
  }
},
  {
  "id": "TUTORIA-PDA-0026",
  "campoFormativo": "Ética, Naturaleza y Sociedades",
  "contenido": "La crianza compartida como prolongación de los cuidados amorosos consensuados, capaces de proveer una continuidad cultural.",
  "pda": "Comparte espacios de relación en los que existe el diálogo, el respeto y el afecto, con las personas adultas de su contexto.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B34:B36",
    "pdaCell": "C35",
    "enLaPlaneacionCell": "D35"
  }
},
  {
  "id": "TUTORIA-PDA-0027",
  "campoFormativo": "Ética, Naturaleza y Sociedades",
  "contenido": "La crianza compartida como prolongación de los cuidados amorosos consensuados, capaces de proveer una continuidad cultural.",
  "pda": "Experimenta apegos seguros y la continuidad cultural, por medio de objetos que se trasladan de su familia al servicio educativo y viceversa.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B34:B36",
    "pdaCell": "C36",
    "enLaPlaneacionCell": "D36"
  }
},
  {
  "id": "TUTORIA-PDA-0028",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El sostenimiento afectivo como base de las experiencias de cuidado que proveen y generan vínculos amorosos para el bienestar y desarrollo de las infancias. ",
  "pda": "Se separa con facilidad de sus figuras de referencia, aceptando el cuidado que le brindan otras personas cercanas.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B39:B41",
    "pdaCell": "C39",
    "enLaPlaneacionCell": "D39"
  }
},
  {
  "id": "TUTORIA-PDA-0029",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El sostenimiento afectivo como base de las experiencias de cuidado que proveen y generan vínculos amorosos para el bienestar y desarrollo de las infancias. ",
  "pda": "Explora su entorno con seguridad mediante el juego, confiando en sus figuras de referencia al disfrutar de la interacción afectiva.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B39:B41",
    "pdaCell": "C40",
    "enLaPlaneacionCell": "D40"
  }
},
  {
  "id": "TUTORIA-PDA-0030",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El sostenimiento afectivo como base de las experiencias de cuidado que proveen y generan vínculos amorosos para el bienestar y desarrollo de las infancias. ",
  "pda": "Transita por los procesos de adaptación de manera gradual construyendo vínculos afectivos e integrándose a la grupalidad.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B39:B41",
    "pdaCell": "C41",
    "enLaPlaneacionCell": "D41"
  }
},
  {
  "id": "TUTORIA-PDA-0031",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El contacto y el sostén como bases del desarrollo corporal y las vivencias afectivas.",
  "pda": "Descubre y desarrolla sus capacidades motrices experimentando la seguridad en el movimiento, mediante la interacción afectiva con sus figuras de referencia.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B42:B44",
    "pdaCell": "C42",
    "enLaPlaneacionCell": "D42"
  }
},
  {
  "id": "TUTORIA-PDA-0032",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El contacto y el sostén como bases del desarrollo corporal y las vivencias afectivas.",
  "pda": "Construye una buena imagen corporal a través de juegos variados y vivencias afectivas de interacción.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B42:B44",
    "pdaCell": "C43",
    "enLaPlaneacionCell": "D43"
  }
},
  {
  "id": "TUTORIA-PDA-0033",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El contacto y el sostén como bases del desarrollo corporal y las vivencias afectivas.",
  "pda": "Encuentra diferentes formas de desplazarse, a partir de objetos, personas o situaciones de su interés que le motivan a moverse libremente siguiendo el gesto espontáneo.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B42:B44",
    "pdaCell": "C44",
    "enLaPlaneacionCell": "D44"
  }
},
  {
  "id": "TUTORIA-PDA-0034",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "Los beneficios que otorga una alimentación perceptiva para niñas, niños y sus familias.",
  "pda": "Disfruta de las experiencias de alimentación, manifestando señales de hambre y saciedad.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B45",
    "pdaCell": "C45",
    "enLaPlaneacionCell": "D45"
  }
},
  {
  "id": "TUTORIA-PDA-0035",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El acompañamiento a niñas y niños en el sueño, desde el respeto, atención y escucha de sus necesidades.",
  "pda": "Experimenta vínculos afectivos seguros durante el sueño, con el acompañamiento corporal y poético de sus figuras de referencia.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B46:B47",
    "pdaCell": "C46",
    "enLaPlaneacionCell": "D46"
  }
},
  {
  "id": "TUTORIA-PDA-0036",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El acompañamiento a niñas y niños en el sueño, desde el respeto, atención y escucha de sus necesidades.",
  "pda": "Encuentra sus propios ritmos en relación con el sueño, para un buen descanso, mediante el acompañamiento respetuoso de sus figuras de referencia.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B46:B47",
    "pdaCell": "C47",
    "enLaPlaneacionCell": "D47"
  }
},
  {
  "id": "TUTORIA-PDA-0037",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "Espacios que proveen seguridad y sostén afectivo para aprender de la comunidad con interés y creatividad.",
  "pda": "Se identifica con el espacio físico para desarrollar su creatividad a través de la exploración de manera segura.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B48",
    "pdaCell": "C48",
    "enLaPlaneacionCell": "D48"
  }
},
  {
  "id": "TUTORIA-PDA-0038",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El desarrollo cerebral como base importante para la adquisición de habilidades. ",
  "pda": "Participa en ambientes alegres que evitan el estrés tóxico, para su desarrollo óptimo.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B49:B51",
    "pdaCell": "C49",
    "enLaPlaneacionCell": "D49"
  }
},
  {
  "id": "TUTORIA-PDA-0039",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El desarrollo cerebral como base importante para la adquisición de habilidades. ",
  "pda": "Encuentra nuevos desafíos en sus exploraciones y asociaciones, a partir de ambientes de aprendizaje variados y retadores.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B49:B51",
    "pdaCell": "C50",
    "enLaPlaneacionCell": "D50"
  }
},
  {
  "id": "TUTORIA-PDA-0040",
  "campoFormativo": "De lo Humano y lo Comunitario",
  "contenido": "El desarrollo cerebral como base importante para la adquisición de habilidades. ",
  "pda": "Desarrolla habilidades socioemocionales a partir de la disponibilidad psíquica, escucha y atención afectiva de sus figuras de referencia.",
  "provenance": {
    "sourceFormCode": "3D11-009-003",
    "sourceSheet": "Anexo5_Planeación Reverso (2)",
    "contenidoRange": "B49:B51",
    "pdaCell": "C51",
    "enLaPlaneacionCell": "D51"
  }
},
]);

/**
 * Utility lookup maps for O(1) immutable catalog resolution.
 */
export const DIRECT_PDA_CATALOG_BY_ID: ReadonlyMap<string, DirectPDAEntry> = new Map(
  DIRECT_PDA_CATALOG.map((entry) => [entry.id, entry])
);

export const DIRECT_PDA_CATALOG_BY_PLAN_CELL: ReadonlyMap<string, DirectPDAEntry> = new Map(
  DIRECT_PDA_CATALOG.map((entry) => [entry.provenance.enLaPlaneacionCell, entry])
);
