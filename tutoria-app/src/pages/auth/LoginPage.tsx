import React, { useState } from 'react';
import { Heading, Text, Card, Button } from '../../components/primitives';
import { Stack, Inline } from '../../components/foundations';
import { Input, Label, FieldError, FieldGroup, Field } from '../../components/forms';
import { Checkbox } from '../../components/forms/Checkbox';
import { useSession } from '../../providers/SessionProvider';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import logoSrc from '../../assets/brand/logos/master/TutorIA_Master_Transparent.png';

export const LoginPage: React.FC = () => {
  const { login, session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  const isLoading = session.status === 'RESTORING';

  return (
    <div className="min-h-screen bg-brandDark flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Círculos sutiles de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-white/5 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1600px] h-[1600px] border border-white/5 rounded-full pointer-events-none" />

      <Stack gap={8} className="w-full max-w-[400px] px-4 z-10 relative">
        <Stack align="center" gap={4}>
          <img src={logoSrc} alt="Logotipo TutorIA" className="w-[200px] object-contain mb-2" />
          <div className="text-center">
            <Heading as="h1" size="3xl" className="text-white tracking-tight">
              Tutor<span className="text-brandPrimary">IA</span>
            </Heading>
            <Text size="md" className="mt-2 text-textLight">
              Plataforma de conocimiento institucional
            </Text>
          </div>
        </Stack>

        <Card className="p-8 shadow-soft bg-white border-0 rounded-[12px]">
          <div className="text-center mb-6">
            <Heading as="h2" size="xl" className="font-poppins font-semibold text-gray-900">Bienvenida de nuevo</Heading>
            <Text size="sm" className="text-gray-500 mt-1">Inicia sesión para continuar</Text>
          </div>

          <form onSubmit={handleSubmit}>
            <Stack gap={5}>
              {session.status === 'ERROR' && (
                <FieldError>{session.error}</FieldError>
              )}

              <Field>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo institucional"
                  leftIcon={<Mail size={20} />}
                  required
                />
              </Field>

              <Field>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  leftIcon={<Lock size={20} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="focus:outline-none hover:text-brandPrimary transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  }
                  required
                />
              </Field>

              <Inline justify="between" align="center" className="mt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="group-hover:border-brandPrimary transition-colors"
                  />
                  <Text size="sm" className="text-gray-700 font-medium">Recordarme</Text>
                </label>
                <a href="#" className="text-sm font-medium text-brandPrimary hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </Inline>

              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                className="w-full h-12 rounded-[50px] font-poppins font-semibold text-white bg-brandPrimary hover:bg-[#008F82] mt-2 group"
              >
                {isLoading ? (
                  "Ingresando..."
                ) : (
                  <Inline align="center" gap={2}>
                    Iniciar sesión
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Inline>
                )}
              </Button>
            </Stack>
          </form>

          <div className="mt-6 bg-surfaceSuccess p-4 rounded-lg flex items-start gap-3 border border-success/20">
            <ShieldCheck className="text-success shrink-0" size={24} />
            <div>
              <Text weight={600} size="sm" className="text-gray-900">Plataforma segura y protegida</Text>
              <Text size="xs" className="text-gray-600 mt-0.5">
                Tu información está protegida con encriptación de nivel institucional.
              </Text>
            </div>
          </div>
        </Card>

        <div className="text-center mt-4">
          <Text size="sm" className="text-textLight">
            © 2026 TutorIA. Todos los derechos reservados.
          </Text>
        </div>
      </Stack>
    </div>
  );
};
