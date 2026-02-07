
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function GlobalAutoLogin() {
  const { user, signIn, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Only attempt login if not loading and no user is present
    if (!isLoading && !user) {
      const performAutoLogin = async () => {
        try {
          const { error } = await signIn('dbcdkwo629@naver.com', '12341234');
          if (error) {
            console.error("Global auto-login failed:", error);
          } else {
            console.log("Global auto-login successful");
            toast({
              title: "자동 로그인",
              description: "체험 계정으로 자동 접속되었습니다.",
              duration: 3000,
            });
          }
        } catch (err) {
          console.error("Global auto-login error:", err);
        }
      };
      
      performAutoLogin();
    }
  }, [isLoading, user, signIn, toast]);

  return null; // This component doesn't render anything
}
