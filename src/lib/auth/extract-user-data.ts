type UserWithRoles = {
  id: string
  full_name: string
  email: string
  user_roles: Array<{
    role: {
      name: string
      permissions: unknown
    }
  }>
}

export function extractUserData(user: UserWithRoles) {
  const roles = user.user_roles.map((ur) => ur.role.name)
  
  const allPermissions = user.user_roles.flatMap((ur) =>
    Array.isArray(ur.role.permissions) ? ur.role.permissions : []
  )
  
  const uniquePermissions = [...new Set(allPermissions)]

  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    roles,
    permissions: uniquePermissions,
  }
}
