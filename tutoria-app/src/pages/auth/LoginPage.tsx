import React, { useState } from 'react';
import { Heading, Text, Card, Button } from '../../components/primitives';
import { Stack, Inline } from '../../components/foundations';
import { Input, Label, FieldHint, FieldError, FieldGroup, Field } from '../../components/forms';
import { useSession } from '../../providers/SessionProvider';

export const LoginPage: React.FC = () => {
  const { login, session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <Stack align="center" justify="center" className="min-h-screen bg-surface-base">
      <Stack gap={6}>
        <Stack align="center">
          <Heading as="h1" size="2xl" color="brandPrimary">TutorIA</Heading>
          <Text color="secondary">
            Ingresa a la plataforma institucional
          </Text>
        </Stack>

        <Card>
          <form onSubmit={handleSubmit}>
            <Stack gap={5}>
              {session.status === 'ERROR' && (
                <FieldError>{session.error}</FieldError>
              )}
              <Field>
                <Label htmlFor="email">Correo Institucional</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="nombre@institucion.edu.mx" 
                  required 
                />
              </Field>
              <Field>
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </Field>
              <Button type="submit" variant="primary" loading={session.status === 'RESTORING'}>
                Iniciar Sesión
              </Button>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Stack>
  );
};
