import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PricingTier } from '@/types';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  tier: PricingTier;
  selected?: boolean;
  onSelect: (tier: PricingTier) => void;
}

export function PricingCard({ tier, selected, onSelect }: PricingCardProps) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all duration-300 hover:shadow-hover',
        selected && 'ring-2 ring-primary shadow-hover',
        tier.recommended && 'border-primary'
      )}
      onClick={() => onSelect(tier)}
    >
      {tier.recommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary">
          <Sparkles className="mr-1 h-3 w-3" />
          추천
        </Badge>
      )}
      <CardHeader className="text-center pb-2">
        <h3 className="text-xl font-bold">{tier.name}</h3>
        <div className="mt-2">
          <span className="text-4xl font-bold text-gradient">
            {tier.price.toLocaleString()}
          </span>
          <span className="text-muted-foreground">원</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ul className="space-y-3">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className={cn(
            'w-full',
            selected ? 'gradient-primary' : tier.recommended ? 'gradient-primary' : ''
          )}
          variant={selected || tier.recommended ? 'default' : 'outline'}
        >
          {selected ? '선택됨' : '선택하기'}
        </Button>
      </CardFooter>
    </Card>
  );
}
