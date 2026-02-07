import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";

export default function SearchPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container py-16 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>부동산 주소 검색은 홈에서 시작됩니다</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              MVP에서는 부동산 주소 기반 흐름만 제공됩니다.
            </p>
            <Button onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-2" />
              홈으로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
