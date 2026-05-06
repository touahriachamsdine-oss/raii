'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Animal = {
    id: string;
    species: string;
    breed: string;
    dob: string;
    gender: string;
    status: string;
};

const downloadCSV = (data: Animal[], farmName: string) => {
    const headers = ['id', 'species', 'breed', 'dob', 'gender', 'status'];
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(fieldName => `"${row[fieldName as keyof Animal]}"`).join(',')
        )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${farmName}_animals.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export function FarmDownloadButton({ animals, farmName }: { animals: Animal[], farmName: string }) {
    const t = useTranslations('Admin.farmDetail');
    return (
        <Button onClick={() => downloadCSV(animals, farmName)} disabled={!animals || animals.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {t('downloadCsv')}
        </Button>
    );
}
