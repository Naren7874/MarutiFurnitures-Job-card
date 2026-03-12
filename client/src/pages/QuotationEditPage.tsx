// QuotationEditPage — thin wrapper; passes quotationId to shared QuotationForm (edit mode)
import { useParams } from 'react-router-dom';
import QuotationForm from '@/components/quotation/QuotationForm';

export default function QuotationEditPage() {
    const { id } = useParams<{ id: string }>();
    return <QuotationForm quotationId={id} />;
}
