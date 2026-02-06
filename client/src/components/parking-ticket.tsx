import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Clock, MapPin, Printer, X } from "lucide-react";

interface ParkingTicketProps {
  sessionId: string;
  plateDisplay: string;
  entryAt: string;
  zoneCode?: string;
  spotNumber?: string;
  confirmationCode?: string;
  onClose?: () => void;
  onPrint?: () => void;
}

export function ParkingTicket({
  sessionId,
  plateDisplay,
  entryAt,
  zoneCode,
  spotNumber,
  confirmationCode,
  onClose,
  onPrint
}: ParkingTicketProps) {
  const ticketUrl = `${window.location.origin}/parking/ticket/${sessionId}`;
  const entryDate = new Date(entryAt);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <Card className="max-w-sm mx-auto bg-white text-black print:shadow-none">
      <CardContent className="pt-6 text-center">
        <div className="flex justify-between items-start mb-4 print:hidden">
          <h2 className="text-lg font-bold">Parking Ticket</h2>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="border-b border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex justify-center mb-4">
            <QRCodeSVG
              value={ticketUrl}
              size={160}
              level="M"
              includeMargin
              className="rounded"
            />
          </div>

          <p className="text-xs text-gray-500 mb-2">Scan to view ticket details</p>

          {confirmationCode && (
            <p className="font-mono text-2xl font-bold tracking-wider">
              {confirmationCode}
            </p>
          )}
        </div>

        <div className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <Car className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">License Plate</p>
              <p className="font-mono font-bold text-lg">{plateDisplay}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Entry Time</p>
              <p className="font-medium">
                {entryDate.toLocaleDateString()} {entryDate.toLocaleTimeString()}
              </p>
            </div>
          </div>

          {(zoneCode || spotNumber) && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-medium">
                  {zoneCode && `Zone ${zoneCode}`}
                  {zoneCode && spotNumber && " - "}
                  {spotNumber && `Spot ${spotNumber}`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
          <p className="text-xs text-gray-500">
            Keep this ticket for exit. Fees calculated based on duration.
          </p>
        </div>

        <div className="mt-4 print:hidden">
          <Button onClick={handlePrint} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Print Ticket
          </Button>
        </div>

        <p className="text-[10px] text-gray-400 mt-4">
          ID: {sessionId.slice(0, 8)}
        </p>
      </CardContent>
    </Card>
  );
}

interface ParkingReceiptProps {
  sessionId: string;
  plateDisplay: string;
  entryAt: string;
  exitAt: string;
  durationFormatted: string;
  fee: number;
  currency?: string;
  zoneCode?: string;
  isPaid?: boolean;
  onClose?: () => void;
  onPrint?: () => void;
}

export function ParkingReceipt({
  sessionId,
  plateDisplay,
  entryAt,
  exitAt,
  durationFormatted,
  fee,
  currency = "USD",
  zoneCode,
  isPaid = false,
  onClose,
  onPrint
}: ParkingReceiptProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency
    }).format(cents / 100);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <Card className="max-w-sm mx-auto bg-white text-black print:shadow-none">
      <CardContent className="pt-6 text-center">
        <div className="flex justify-between items-start mb-4 print:hidden">
          <h2 className="text-lg font-bold">Parking Receipt</h2>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="border-b border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex justify-center mb-2">
            <QRCodeSVG
              value={`${window.location.origin}/parking/receipt/${sessionId}`}
              size={120}
              level="M"
              className="rounded"
            />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Plate:</span>
            <span className="font-mono font-bold">{plateDisplay}</span>
          </div>
          {zoneCode && (
            <div className="flex justify-between">
              <span className="text-gray-500">Zone:</span>
              <span>{zoneCode}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Entry:</span>
            <span>{new Date(entryAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Exit:</span>
            <span>{new Date(exitAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration:</span>
            <span>{durationFormatted}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
          <div className="flex justify-between items-center text-lg">
            <span className="font-bold">Total:</span>
            <span className="font-bold text-2xl">{formatCurrency(fee)}</span>
          </div>
          {isPaid && (
            <p className="text-green-600 font-medium mt-2">PAID</p>
          )}
        </div>

        <div className="mt-4 print:hidden">
          <Button onClick={handlePrint} variant="outline" className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>

        <p className="text-[10px] text-gray-400 mt-4">
          {new Date().toLocaleString()} | {sessionId.slice(0, 8)}
        </p>
      </CardContent>
    </Card>
  );
}
