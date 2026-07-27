import masterTransparentSrc from '../assets/brand/logos/master/TutorIA_Master_Transparent.png';
import imagotypeTransparentSrc from '../assets/brand/logos/imagotype/TutorIA_Imagotype_Transparent.png';
import logotypeTransparentSrc from '../assets/brand/logos/logotype/TutorIA_Logotype_Transparent.png';

export interface BrandLogos {
  masterColor: string | null;
  masterTransparent: string | null;
  imagotypeColor: string | null;
  imagotypeTransparent: string | null;
  logotypeColor: string | null;
  logotypeTransparent: string | null;
  isotypeRobotColor: string | null;
  isotypeRobotTransparent: string | null;
  educationSealColor: string | null;
  educationSealTransparent: string | null;
}

export const logos: BrandLogos = {
  masterColor: null,
  masterTransparent: masterTransparentSrc,
  imagotypeColor: null,
  imagotypeTransparent: imagotypeTransparentSrc,
  logotypeColor: null,
  logotypeTransparent: logotypeTransparentSrc,
  isotypeRobotColor: null,
  isotypeRobotTransparent: null,
  educationSealColor: null,
  educationSealTransparent: null,
};
