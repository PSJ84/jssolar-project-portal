"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PriceTableManager } from "@/components/settings/PriceTableManager";
import { SystemConfigManager } from "@/components/settings/SystemConfigManager";
import { ArrowLeft, Package, Cpu, Building, Hammer, MoreHorizontal, Settings } from "lucide-react";

export default function PriceTablePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">단가표 관리</h1>
          <p className="text-muted-foreground mt-1">
            견적서 작성에 사용되는 단가와 시스템 설정을 관리합니다.
          </p>
        </div>
      </div>

      <Tabs defaultValue="MODULE" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger value="MODULE" className="flex items-center gap-2 py-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">모듈</span>
          </TabsTrigger>
          <TabsTrigger value="INVERTER" className="flex items-center gap-2 py-2">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">인버터</span>
          </TabsTrigger>
          <TabsTrigger value="STRUCTURE" className="flex items-center gap-2 py-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">구조물</span>
          </TabsTrigger>
          <TabsTrigger value="LABOR" className="flex items-center gap-2 py-2">
            <Hammer className="h-4 w-4" />
            <span className="hidden sm:inline">인건비</span>
          </TabsTrigger>
          <TabsTrigger value="ETC" className="flex items-center gap-2 py-2">
            <MoreHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">기타</span>
          </TabsTrigger>
          <TabsTrigger value="CONFIG" className="flex items-center gap-2 py-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">시스템 설정</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="MODULE">
          <PriceTableManager category="MODULE" />
        </TabsContent>

        <TabsContent value="INVERTER">
          <PriceTableManager category="INVERTER" />
        </TabsContent>

        <TabsContent value="STRUCTURE">
          <PriceTableManager category="STRUCTURE" />
        </TabsContent>

        <TabsContent value="LABOR">
          <PriceTableManager category="LABOR" />
        </TabsContent>

        <TabsContent value="ETC">
          <PriceTableManager category="ETC" />
        </TabsContent>

        <TabsContent value="CONFIG">
          <SystemConfigManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
