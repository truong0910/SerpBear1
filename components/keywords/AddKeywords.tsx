import React, { useCallback, useMemo, useRef, useState } from 'react';
import Icon from '../common/Icon';
import LockedHint from '../common/LockedHint';
import Modal from '../common/Modal';
import SelectField from '../common/SelectField';
import countries from '../../utils/countries';
import { useAddKeywords } from '../../services/keywords';

type AddKeywordsProps = {
   keywords: KeywordType[],
   scraperName: string,
   allowsCity: boolean,
   closeModal: Function,
   domain: string
}

type KeywordsInput = {
   keywords: string,
   device: string,
   country: string,
   domain: string,
   tags: string,
   city?:string,
}

const AddKeywords = ({ closeModal, domain, keywords, scraperName = '', allowsCity = false }: AddKeywordsProps) => {
   const inputRef = useRef(null);
   const defCountry = localStorage.getItem('default_country') || 'US';

   const [error, setError] = useState<string>('');
   const [showTagSuggestions, setShowTagSuggestions] = useState(false);
   const [newKeywordsData, setNewKeywordsData] = useState<KeywordsInput>({ keywords: '', device: 'desktop', country: defCountry, domain, tags: '' });
   const { mutate: addMutate, isLoading: isAdding } = useAddKeywords(() => closeModal(false));

   const existingTags: string[] = useMemo(() => {
      const allTags = keywords.reduce((acc: string[], keyword) => [...acc, ...keyword.tags], []).filter((t) => t && t.trim() !== '');
      return [...new Set(allTags)];
   }, [keywords]);

   const setDeviceType = useCallback((input:string) => {
      let updatedDevice = '';
      if (newKeywordsData.device.includes(input)) {
         updatedDevice = newKeywordsData.device.replace(',', '').replace(input, '');
      } else {
         updatedDevice = newKeywordsData.device ? `${newKeywordsData.device},${input}` : input;
      }
      setNewKeywordsData({ ...newKeywordsData, device: updatedDevice });
   }, [newKeywordsData]);

   const addKeywords = () => {
      const nkwrds = newKeywordsData;
      if (nkwrds.keywords) {
         const devices = nkwrds.device.split(',');
         const multiDevice = nkwrds.device.includes(',') && devices.length > 1;
         const keywordsArray = [...new Set(nkwrds.keywords.split('\n').map((item) => item.trim()).filter((item) => !!item))];
         const currentKeywords = keywords.map((k) => `${k.keyword}-${k.device}-${k.country}${k.city ? `-${k.city}` : ''}`);

         const keywordExist = keywordsArray.filter((k) =>
            devices.some((device) => currentKeywords.includes(`${k}-${device}-${nkwrds.country}${nkwrds.city ? `-${nkwrds.city}` : ''}`)),
         );

         if (!multiDevice && (keywordsArray.length === 1 || currentKeywords.length === keywordExist.length) && keywordExist.length > 0) {
            setError(`Từ khóa ${keywordExist.join(',')} đã có rồi`);
            setTimeout(() => { setError(''); }, 3000);
         } else {
            const newKeywords = keywordsArray.flatMap((k) =>
               devices.filter((device) =>
                 !currentKeywords.includes(`${k}-${device}-${nkwrds.country}${nkwrds.city ? `-${nkwrds.city}` : ''}`),
               ).map((device) => ({
                 keyword: k,
                 device,
                 country: nkwrds.country,
                 domain: nkwrds.domain,
                 tags: nkwrds.tags,
                 city: nkwrds.city,
               })),
             );
            addMutate(newKeywords);
         }
      } else {
         setError('Vui lòng nhập ít nhất một từ khóa');
         setTimeout(() => { setError(''); }, 3000);
      }
   };

   const deviceTabStyle = 'cursor-pointer px-2 py-2 rounded';

   return (
      <Modal closeModal={() => { closeModal(false); }} title={'Thêm từ khóa mới'} width="[420px]">
         <div data-testid="addkeywords_modal">
            <div>
               <div>
                  <textarea
                     className='w-full h-40 border rounded border-gray-200 p-4 outline-none focus:border-indigo-300'
                     placeholder="Nhập hoặc dán từ khóa, mỗi từ khóa một dòng."
                     value={newKeywordsData.keywords}
                     onChange={(e) => setNewKeywordsData({ ...newKeywordsData, keywords: e.target.value })}>
                  </textarea>
               </div>

               <div className=' my-3 flex justify-between text-sm'>
                  <div>
                  <SelectField
                     multiple={false}
                     selected={[newKeywordsData.country]}
                     options={Object.keys(countries).map((countryISO:string) => { return { label: countries[countryISO][0], value: countryISO }; })}
                     defaultLabel='Tất cả quốc gia'
                     updateField={(updated:string[]) => {
                        setNewKeywordsData({ ...newKeywordsData, country: updated[0] });
                        localStorage.setItem('default_country', updated[0]);
                     }}
                     rounded='rounded'
                     maxHeight={48}
                     flags={true}
                  />
                  </div>
                  <ul className='flex text-xs font-semibold text-gray-500'>
                     <li
                        className={`${deviceTabStyle} mr-2 ${newKeywordsData.device.includes('desktop') ? '  bg-indigo-50 text-indigo-700' : ''}`}
                        onClick={() => setDeviceType('desktop')}>
                           <Icon type='desktop' classes={'top-[3px]'} size={15} /> <i className='not-italic hidden lg:inline-block'>Máy tính</i>
                           <Icon type='check' classes={'pl-1'} size={12} color={newKeywordsData.device.includes('desktop') ? '#4338ca' : '#bbb'} />
                        </li>
                     <li
                        className={`${deviceTabStyle} ${newKeywordsData.device.includes('mobile') ? '  bg-indigo-50 text-indigo-700' : ''}`}
                        onClick={() => setDeviceType('mobile')}>
                           <Icon type='mobile' /> <i className='not-italic hidden lg:inline-block'>Điện thoại</i>
                           <Icon type='check' classes={'pl-1'} size={12} color={newKeywordsData.device.includes('mobile') ? '#4338ca' : '#bbb'} />
                        </li>
                  </ul>
               </div>
               <div className='relative'>
                  <input
                     className='w-full border rounded border-gray-200 py-2 px-4 pl-12 outline-none focus:border-indigo-300'
                     placeholder='Nhãn (không bắt buộc)'
                     value={newKeywordsData.tags}
                     onChange={(e) => setNewKeywordsData({ ...newKeywordsData, tags: e.target.value })}
                  />
                  <span className='absolute text-gray-400 top-3 left-2 cursor-pointer' onClick={() => setShowTagSuggestions(!showTagSuggestions)}>
                     <Icon type="tags" size={16} color={showTagSuggestions ? '#777' : '#aaa'} />
                     <Icon type={showTagSuggestions ? 'caret-up' : 'caret-down'} size={14} color={showTagSuggestions ? '#666' : '#aaa'} />
                  </span>
                  {showTagSuggestions && (
                     <ul className={`absolute z-50
                     bg-white border border-t-0 border-gray-200 rounded rounded-t-none w-full`}>
                        {existingTags.length > 0 && existingTags.map((tag, index) => {
                           return newKeywordsData.tags.split(',').map((t) => t.trim()).includes(tag) === false && <li
                                    className=' p-2 cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 transition'
                                    key={index}
                                    onClick={() => {
                                       const tagInput = newKeywordsData.tags;
                                       // eslint-disable-next-line no-nested-ternary
                                       const tagToInsert = tagInput + (tagInput.trim().slice(-1) === ',' ? '' : (tagInput.trim() ? ', ' : '')) + tag;
                                       setNewKeywordsData({ ...newKeywordsData, tags: tagToInsert });
                                       setShowTagSuggestions(false);
                                       if (inputRef?.current) (inputRef.current as HTMLInputElement).focus();
                                    }}>
                                       <Icon type='tags' size={14} color='#bbb' /> {tag}
                                    </li>;
                        })}
                        {existingTags.length === 0 && <p>Chưa có nhãn nào... </p>}
                     </ul>
                  )}
               </div>
               <div className='relative mt-2'>
                  <input
                     className={`w-full border rounded border-gray-200 py-2 px-4 pl-8 
                     outline-none focus:border-indigo-300 ${!allowsCity ? ' cursor-not-allowed' : ''} `}
                     disabled={!allowsCity}
                     title={!allowsCity ? `Công cụ ${scraperName} không hỗ trợ chọn thành phố.` : ''}
                     placeholder={`Thành phố (không bắt buộc)${!allowsCity ? `. Không dùng được với ${scraperName}.` : ''}`}
                     value={newKeywordsData.city}
                     onChange={(e) => setNewKeywordsData({ ...newKeywordsData, city: e.target.value })}
                  />
                  <span className='absolute text-gray-400 top-2 left-2'><Icon type="city" size={16} /></span>
               </div>
               {!allowsCity && <LockedHint reason='Công cụ lấy thứ hạng đang dùng không hỗ trợ chọn thành phố. Đổi công cụ trong Cài đặt.' />}
            </div>
            {error && <div className='w-full mt-4 p-3 text-sm bg-red-50 text-red-700'>{error}</div>}
            <div className='mt-6 text-right text-sm font-semibold flex justify-between'>
               <button
                  className=' py-2 px-5 rounded cursor-pointer bg-indigo-50 text-slate-500 mr-3'
                  onClick={() => closeModal(false)}>
                     Hủy
               </button>
               <button
                  className=' py-2 px-5 rounded cursor-pointer bg-blue-700 text-white'
                  onClick={() => !isAdding && addKeywords()}>
                     {isAdding ? 'Đang thêm....' : 'Thêm từ khóa'}
               </button>
            </div>
         </div>
      </Modal>
   );
};

export default AddKeywords;
