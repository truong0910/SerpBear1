/* eslint-disable max-len */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutateKeywordIdeas } from '../../services/adwords';
import allCountries, { adwordsLanguages } from '../../utils/countries';
import SelectField from '../common/SelectField';
import Icon from '../common/Icon';
import LockedHint from '../common/LockedHint';

interface KeywordIdeasUpdaterProps {
   onUpdate?: Function,
   domain?: DomainType,
   searchConsoleConnected: boolean,
   adwordsConnected: boolean,
   openSettings?: (tab: 'integrations') => void,
   settings?: {
      seedSCKeywords: boolean,
      seedCurrentKeywords: boolean,
      seedDomain: boolean,
      language: string,
      countries: string[],
      keywords: string,
      seedType: string
   }
}

const KeywordIdeasUpdater = ({ onUpdate, settings, domain, searchConsoleConnected = false, adwordsConnected = false, openSettings }: KeywordIdeasUpdaterProps) => {
   const router = useRouter();
   const [seedType, setSeedType] = useState(() => settings?.seedType || 'auto');
   const [language, setLanguage] = useState(() => settings?.language.toString() || '1000');
   const [countries, setCountries] = useState<string[]>(() => settings?.countries || ['US']);
   const [keywords, setKeywords] = useState(() => (settings?.keywords && Array.isArray(settings?.keywords) ? settings?.keywords.join(',') : ''));
   const { mutate: updateKeywordIdeas, isLoading: isUpdatingIdeas } = useMutateKeywordIdeas(router, () => onUpdate && onUpdate());

   const seedTypeOptions = useMemo(() => {
      const options = [
        { label: 'Tự động từ nội dung website', value: 'auto' },
        { label: 'Dựa trên các từ khóa đang theo dõi', value: 'tracking' },
        { label: 'Từ các từ khóa bạn nhập', value: 'custom' },
      ];

      if (searchConsoleConnected) {
        options.splice(-2, 0, { label: 'Dựa trên các từ khóa đã có thứ hạng (Search Console)', value: 'searchconsole' });
      }

      return options;
    }, [searchConsoleConnected]);

   const reloadKeywordIdeas = () => {
      const keywordPaylod = seedType !== 'auto' && keywords ? keywords.split(',').map((key) => key.trim()) : undefined;
      console.log('keywordPaylod :', keywords, keywordPaylod);
      updateKeywordIdeas({
         seedType,
         language,
         domain: domain?.domain,
         domainSlug: domain?.slug,
         keywords: keywordPaylod,
         country: countries[0],
      });
   };

   const countryOptions = useMemo(() => {
      return Object.keys(allCountries)
      .filter((countryISO) => allCountries[countryISO][3] !== 0)
      .map((countryISO) => ({ label: allCountries[countryISO][0], value: countryISO }));
   }, []);

   const languageOPtions = useMemo(() => Object.entries(adwordsLanguages).map(([value, label]) => ({ label, value })), []);

   const labelStyle = 'mb-2 font-semibold inline-block text-sm text-gray-700 w-full';
   return (
      <div>

            <div>
               <div className={'mb-3'}>
                  <label className={labelStyle}>Lấy gợi ý từ khóa</label>
                  <SelectField
                     selected={[seedType]}
                     options={seedTypeOptions}
                     defaultLabel='Lấy gợi ý dựa trên'
                     updateField={(updated:string[]) => setSeedType(updated[0])}
                     fullWidth={true}
                     multiple={false}
                     rounded='rounded'
                  />
               </div>
               {seedType === 'custom' && (
                  <>
                     <div className={'mb-3'}>
                        <label className={labelStyle}>Lấy gợi ý từ các từ khóa này (tối đa 20)</label>
                        <textarea
                        className='w-full border border-solid border-gray-300 focus:border-blue-100 p-3 rounded outline-none'
                        value={keywords}
                        onChange={(event) => setKeywords(event.target.value)}
                        placeholder="từ khóa 1, từ khóa 2.."
                        />
                     </div>
                     <hr className=' my-4' />
                  </>
               )}

               <div className={'mb-3'}>
                  <label className={labelStyle}>Quốc gia</label>
                  <SelectField
                     selected={countries}
                     options={countryOptions}
                     defaultLabel='Tất cả quốc gia'
                     updateField={(updated:string[]) => setCountries(updated)}
                     flags={true}
                     multiple={false}
                     fullWidth={true}
                     maxHeight={48}
                     rounded='rounded'
                  />
               </div>
               <div className={'mb-3'}>
                  <label className={labelStyle}>Ngôn ngữ</label>
                  <SelectField
                     selected={[language]}
                     options={languageOPtions}
                     defaultLabel='Tất cả ngôn ngữ'
                     updateField={(updated:string[]) => setLanguage(updated[0])}
                     rounded='rounded'
                     multiple={false}
                     fullWidth={true}
                     maxHeight={48}
                  />
               </div>

               <button
                  className={`w-full py-2 px-5 mt-2 rounded bg-blue-700 text-white 
                  font-semibold ${!adwordsConnected ? ' cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  title={!adwordsConnected ? 'Cần kết nối Google Ads để lấy gợi ý từ khóa.' : ''}
                  onClick={() => !isUpdatingIdeas && adwordsConnected && reloadKeywordIdeas()}>
                     <Icon type={isUpdatingIdeas ? 'loading' : 'reload'} size={12} /> {isUpdatingIdeas ? 'Đang tải....' : 'Lấy gợi ý từ khóa'}
               </button>
               {!adwordsConnected && (
                  <LockedHint reason='Cần kết nối Google Ads để lấy gợi ý từ khóa.' actionLabel='Mở Cài đặt › Tích hợp' onAction={openSettings ? () => openSettings('integrations') : undefined} />
               )}
            </div>
      </div>
   );
};

export default KeywordIdeasUpdater;
