import React from 'react';

const ThermalInvoice = React.forwardRef(({ bill, companyDetails }, ref) => {
    if (!bill) return null;

    return (
        <div ref={ref} className="bg-white p-2 text-xs font-mono w-[80mm] leading-tight text-black">
            {/* Header */}
            <div className="text-center mb-2">
                <h1 className="text-lg font-bold mb-1">{companyDetails.name}</h1>
                <p>{companyDetails.address}</p>
                <p>Ph: {companyDetails.phone}</p>
                {companyDetails.gstin && <p>GSTIN: {companyDetails.gstin}</p>}
            </div>

            <div className="border-b border-black border-dashed my-2"></div>

            {/* Bill Details */}
            <div className="flex justify-between mb-1">
                <span>Inv: {bill.bill_number}</span>
                <span>{new Date(bill.bill_date).toLocaleDateString('en-LK')}</span>
            </div>
            <div className="mb-2">
                <p>To: {bill.customer_name}</p>
                {bill.phone && <p>Ph: {bill.phone}</p>}
            </div>

            <div className="border-b border-black border-dashed my-2"></div>

            {/* Items */}
            <table className="w-full text-left mb-2">
                <thead>
                    <tr>
                        <th className="w-[45%]">Item</th>
                        <th className="w-[15%] text-right">Qty</th>
                        <th className="w-[20%] text-right">Rate</th>
                        <th className="w-[20%] text-right">Amt</th>
                    </tr>
                </thead>
                <tbody>
                    {bill.items && bill.items.map((item, index) => (
                        <tr key={index}>
                            <td className="align-top pr-1">{item.description}</td>
                            <td className="align-top text-right">{item.quantity}</td>
                            <td className="align-top text-right">{parseFloat(item.rate).toFixed(0)}</td>
                            <td className="align-top text-right">{parseFloat(item.amount).toFixed(0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-b border-black border-dashed my-2"></div>

            {/* Totals */}
            <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>LKR {parseFloat(bill.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Tax Breakdown (Simplified for Thermal) */}
            <div className="mt-1 text-[10px] text-right">
                {parseFloat(bill.cgst) > 0 && <p>Includes CGST: {parseFloat(bill.cgst).toFixed(2)}</p>}
                {parseFloat(bill.sgst) > 0 && <p>Includes SGST: {parseFloat(bill.sgst).toFixed(2)}</p>}
                {parseFloat(bill.igst) > 0 && <p>Includes IGST: {parseFloat(bill.igst).toFixed(2)}</p>}
            </div>

            <div className="border-b border-black border-dashed my-2"></div>

            {/* Footer */}
            <div className="text-center mt-2">
                <p>Thank you for your visit!</p>
                <p className="text-[10px] mt-1">Software by PrintShop Pro</p>
            </div>
        </div>
    );
});

export default ThermalInvoice;
