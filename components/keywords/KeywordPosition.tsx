import Icon from '../common/Icon';

type KeywordPositionProps = {
   position: number,
   updating?: boolean,
   type?: string,
   notFoundText?: string,
}

const KeywordPosition = ({ position = 0, type = '', updating = false, notFoundText = 'Chưa lọt top 100' }:KeywordPositionProps) => {
   if (!updating && position === 0) {
      return <span className='text-gray-400' title={notFoundText}>{notFoundText}</span>;
   }
   if (updating && type !== 'sc') {
      return <span title='Đang cập nhật…'><Icon type="loading" /></span>;
   }
   return <>{Math.round(position)}</>;
};

export default KeywordPosition;
