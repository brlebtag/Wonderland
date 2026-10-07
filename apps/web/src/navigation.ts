import { useLocation, useNavigate } from 'react-router';

/** Volta para a tela anterior; se a página foi aberta direto pela URL, vai para `fallback`. */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  return () => (location.key !== 'default' ? navigate(-1) : navigate(fallback));
}
