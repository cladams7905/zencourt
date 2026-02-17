import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@web/src/components/ui/card";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@web/src/components/ui/table";
import type { ListingSaleHistory } from "@shared/types/models";
import {
  toNullableNumber,
  toNullableString
} from "@web/src/components/listings/review/shared/formatters";

type ReviewSaleHistoryCardProps = {
  saleHistory: ListingSaleHistory[];
  setSaleHistory: (next: ListingSaleHistory[]) => void;
  triggerAutoSave: () => void;
};

export const ReviewSaleHistoryCard = ({
  saleHistory,
  setSaleHistory,
  triggerAutoSave
}: ReviewSaleHistoryCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sale history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Sales</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSaleHistory([...saleHistory, {}])}
          >
            Add sale
          </Button>
        </div>
        {saleHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sale history added.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Close date</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>$/sq ft</TableHead>
                <TableHead>List price</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {saleHistory.map((entry, index) => (
                <TableRow key={`sale-${index}`}>
                  <TableCell>
                    <Input
                      value={entry.event ?? ""}
                      onChange={(event) => {
                        const next = [...saleHistory];
                        next[index] = {
                          ...next[index],
                          event: toNullableString(event.target.value)
                        };
                        setSaleHistory(next);
                      }}
                      onBlur={triggerAutoSave}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.close_date ?? ""}
                      onChange={(event) => {
                        const next = [...saleHistory];
                        next[index] = {
                          ...next[index],
                          close_date: toNullableString(event.target.value)
                        };
                        setSaleHistory(next);
                      }}
                      onBlur={triggerAutoSave}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={entry.sale_price_usd ?? ""}
                      onChange={(event) => {
                        const next = [...saleHistory];
                        next[index] = {
                          sale_price_usd: toNullableNumber(event.target.value)
                        };
                        setSaleHistory(next);
                      }}
                      onBlur={triggerAutoSave}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={entry.price_per_sq_ft_usd ?? ""}
                      onChange={(event) => {
                        const next = [...saleHistory];
                        next[index] = {
                          ...next[index],
                          price_per_sq_ft_usd: toNullableNumber(event.target.value)
                        };
                        setSaleHistory(next);
                      }}
                      onBlur={triggerAutoSave}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={entry.list_price_usd ?? ""}
                      onChange={(event) => {
                        const next = [...saleHistory];
                        next[index] = {
                          ...next[index],
                          list_price_usd: toNullableNumber(event.target.value)
                        };
                        setSaleHistory(next);
                      }}
                      onBlur={triggerAutoSave}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const next = saleHistory.filter((_, idx) => idx !== index);
                        setSaleHistory(next);
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
