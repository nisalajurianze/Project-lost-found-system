const ACCOUNT_ACTION_PREFIXES = ['admin/', 'claims/', 'foundItems/', 'lostItems/', 'matches/', 'notifications/'];
const IDENTITY_OPERATIONS = new Set(['auth/fetchCurrentUser', 'auth/googleLogin', 'auth/login', 'auth/register']);

const getPrincipalId = (authState) => String(authState?.user?._id || authState?.user?.id || '');
const getOperation = (type = '') => type.replace(/\/(pending|fulfilled|rejected)$/, '');
const isAccountOperation = (operation) => ACCOUNT_ACTION_PREFIXES.some((prefix) => operation.startsWith(prefix));
const getRequestGroup = (operation) => IDENTITY_OPERATIONS.has(operation) ? 'auth/identity' : operation;

const createAccountRequestFenceMiddleware = ({ onBoundaryChange = () => undefined } = {}) => {
  const latestRequests = new Map();

  return ({ getState }) => (next) => (action) => {
    const requestStatus = action?.meta?.requestStatus;
    const operation = getOperation(action?.type);
    const trackedOperation = isAccountOperation(operation) || IDENTITY_OPERATIONS.has(operation);
    const group = getRequestGroup(operation);
    const principalBefore = getPrincipalId(getState()?.auth);

    if (requestStatus === 'pending' && trackedOperation && action.meta?.requestId) {
      latestRequests.set(group, { requestId: action.meta.requestId, principalId: principalBefore });
    }

    if ((requestStatus === 'fulfilled' || requestStatus === 'rejected') && trackedOperation) {
      const latest = latestRequests.get(group);
      const staleRequest = !latest || latest.requestId !== action.meta?.requestId;
      const stalePrincipal = isAccountOperation(operation) && latest?.principalId !== principalBefore;
      if (staleRequest || stalePrincipal) return action;
      latestRequests.delete(group);
    }

    if (action?.type === 'auth/logout/pending' || action?.type === 'auth/clearAuth') {
      latestRequests.clear();
      onBoundaryChange(principalBefore);
    }

    const result = next(action);
    const principalAfter = getPrincipalId(getState()?.auth);
    if (principalAfter !== principalBefore) {
      latestRequests.clear();
      onBoundaryChange(principalBefore);
    }
    return result;
  };
};

export {
  ACCOUNT_ACTION_PREFIXES,
  IDENTITY_OPERATIONS,
  getPrincipalId,
  createAccountRequestFenceMiddleware,
};
