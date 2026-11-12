export type WorkspaceRole = 'owner' | 'editor' | 'viewer' | 'manager' | 'hod' | 'employee';

const allowedPaths: Record<WorkspaceRole, readonly string[]> = {
  owner: ['/', '/pdr', '/staff', '/cycles', '/reports', '/team'],
  editor: ['/', '/pdr', '/staff', '/cycles', '/reports'],
  viewer: ['/', '/pdr', '/reports'],
  manager: ['/', '/pdr', '/staff'],
  hod: ['/', '/pdr', '/staff'],
  employee: ['/', '/pdr'],
};

export function canOpenWorkspacePath(role: WorkspaceRole | undefined, pathname: string) {
  return !!role && allowedPaths[role].includes(pathname);
}

export function visibleWorkspacePaths(role: WorkspaceRole | undefined) {
  return role ? allowedPaths[role] : ['/', '/pdr'];
}

export function effectivePdrRole(role: WorkspaceRole | undefined, viewerEmail: string | null | undefined, employeeEmail: string | null | undefined): WorkspaceRole | undefined {
  if (role === 'owner' || role === 'editor') return role;
  const viewer = viewerEmail?.trim().toLowerCase();
  const employee = employeeEmail?.trim().toLowerCase();
  return viewer && employee && viewer === employee ? 'employee' : role;
}
