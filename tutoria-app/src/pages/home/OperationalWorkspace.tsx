import React, { useEffect, useState } from 'react';
import { AppShell, ContentArea, LoadingState } from '../../components/layouts';
import { Button } from '../../components/primitives';
import { Stack } from '../../components/foundations';
import { useSession } from '../../providers/SessionProvider';
import { useMembership } from '../../providers/MembershipProvider';
import { useInfrastructure } from '../../composition/AppProviders';
import { WorkspaceReadModel } from '../../application/workspace/WorkspaceReadModel';
import { OperationalIdentityZone } from '../../components/workspace/OperationalIdentityZone';
import { FocusZone } from '../../components/workspace/FocusZone';
import { ContinuityZone } from '../../components/workspace/ContinuityZone';
import { WorkQueueZone } from '../../components/workspace/WorkQueueZone';
import { NextActionZone } from '../../components/workspace/NextActionZone';

export const OperationalWorkspace: React.FC = () => {
  const { logout } = useSession();
  const { contextState, selectContext } = useMembership();
  const { workspaceSeedRepository } = useInfrastructure();
  
  const [workspaceData, setWorkspaceData] = useState<WorkspaceReadModel | null>(null);
  const [loading, setLoading] = useState(true);

  const activeContext = contextState.activeContext;

  useEffect(() => {
    if (activeContext) {
      setLoading(true);
      workspaceSeedRepository.getWorkspaceForContext(activeContext)
        .then(data => setWorkspaceData(data))
        .catch(err => console.error('Error loading workspace', err))
        .finally(() => setLoading(false));
    }
  }, [activeContext, workspaceSeedRepository]);

  if (!activeContext) return null;

  return (
    <AppShell>
      <div className="px-6 py-8 md:flex md:items-center md:justify-between max-w-5xl mx-auto w-full">
        <OperationalIdentityZone context={activeContext} />
        <div className="mt-4 flex md:mt-0 md:ml-4 flex-row gap-3 items-center">
          {contextState.availableMemberships.length > 1 && (
            <Button variant="outline" onClick={() => selectContext('')}>
              Cambiar Centro
            </Button>
          )}
          <Button variant="outline" onClick={logout}>Cerrar Sesión</Button>
        </div>
      </div>
      <ContentArea>
        <div className="p-6 max-w-5xl mx-auto pt-0">
          {loading || !workspaceData ? (
            <LoadingState text="Cargando tu espacio operativo..." />
          ) : (
            <Stack gap={8}>
              {workspaceData.focus && <FocusZone focus={workspaceData.focus} />}
              
              {workspaceData.continuityItems.length > 0 && (
                <ContinuityZone items={workspaceData.continuityItems} />
              )}
              
              <WorkQueueZone queue={workspaceData.workQueue} />
              
              <NextActionZone actions={workspaceData.nextActions} />
            </Stack>
          )}
        </div>
      </ContentArea>
    </AppShell>
  );
};
