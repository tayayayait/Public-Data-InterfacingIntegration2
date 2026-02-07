import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  CreditCard, 
  FileText,
  Bell,
  Shield,
  Loader2,
  Camera
} from 'lucide-react';

export default function MyPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    company: profile?.company || '',
  });

  const handleSave = async () => {
    setIsLoading(true);
    // 저장 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast({
      title: '저장 완료',
      description: '프로필이 업데이트되었습니다.',
    });
    setIsLoading(false);
  };

  // 통계 데이터
  const stats = {
    totalReports: 12,
    completedReports: 10,
    totalSpent: 580000,
  };

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">마이페이지</h1>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Profile Summary */}
          <div className="lg:col-span-1">
            <Card className="shadow-card">
              <CardContent className="pt-6 text-center">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-3xl">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="mt-4 text-xl font-semibold">
                  {profile?.full_name || '사용자'}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                
                <Separator className="my-6" />
                
                <div className="space-y-4 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">총 보고서</span>
                    <span className="font-semibold">{stats.totalReports}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">완료된 보고서</span>
                    <span className="font-semibold">{stats.completedReports}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">총 결제 금액</span>
                    <span className="font-semibold text-primary">
                      {stats.totalSpent.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="profile">
                  <User className="mr-2 h-4 w-4" />
                  프로필
                </TabsTrigger>
                <TabsTrigger value="payments">
                  <CreditCard className="mr-2 h-4 w-4" />
                  결제 내역
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  알림 설정
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="mr-2 h-4 w-4" />
                  보안
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>프로필 정보</CardTitle>
                    <CardDescription>
                      개인 정보를 관리합니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">이메일</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            value={user?.email || ''}
                            disabled
                            className="pl-10 bg-muted"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          이메일은 변경할 수 없습니다
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="fullName">이름</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) =>
                              setFormData({ ...formData, fullName: e.target.value })
                            }
                            placeholder="이름을 입력하세요"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone">연락처</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({ ...formData, phone: e.target.value })
                            }
                            placeholder="010-0000-0000"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="company">회사/소속</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) =>
                              setFormData({ ...formData, company: e.target.value })
                            }
                            placeholder="회사명 또는 소속"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSave}
                      className="gradient-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        '변경사항 저장'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <CardTitle>결제 내역</CardTitle>
                    <CardDescription>
                      보고서 구매 및 결제 내역을 확인합니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { id: 1, title: '2024 반도체 시장 분석', amount: 59000, date: '2024-01-15', status: 'completed' },
                        { id: 2, title: '테슬라 기업 분석', amount: 29000, date: '2024-01-10', status: 'completed' },
                        { id: 3, title: '생성형 AI 분석', amount: 99000, date: '2024-01-20', status: 'completed' },
                      ].map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between py-4 border-b last:border-0"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.title}</p>
                              <p className="text-sm text-muted-foreground">{payment.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{payment.amount.toLocaleString()}원</p>
                            <Badge variant="secondary" className="text-xs">
                              결제 완료
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>알림 설정</CardTitle>
                    <CardDescription>
                      이메일 및 푸시 알림을 설정합니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      알림 설정 기능은 준비 중입니다.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>보안 설정</CardTitle>
                    <CardDescription>
                      비밀번호 및 계정 보안을 관리합니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline">비밀번호 변경</Button>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        마지막 로그인: 2024년 1월 21일 10:30
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}
