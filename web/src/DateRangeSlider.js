import { Range } from 'react-range';
import { useEffect, useRef } from 'react';

export default function DateRangeSlider({
    sliderValue,
    setSliderValue,
    setDateFilter,
    minDate,
    maxDate,
}) {
    const debounceRef = useRef(null);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            setDateFilter(sliderValue);
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [sliderValue, setDateFilter]);

    return (
        <div className="p-4" style={{ maxWidth: '80%' }}>
            <Range
                step={24 * 60 * 60 * 1000}
                min={minDate}
                max={maxDate}
                values={sliderValue}
                onChange={setSliderValue}
                renderTrack={({ props, children }) => {
                    const { key, ...rest } = props;

                    return (
                        <div
                            {...props}
                            ref={props.ref}
                            style={{
                                ...props.style,
                                width: '100%',
                                height: '6px',
                                background: '#ccc',
                                borderRadius: '4px',
                            }}
                        >
                            {children}
                        </div>
                    );
                }}

                renderThumb={({ props }) => {
                    const { key, ...rest } = props;

                    return (
                        <div
                            key={key}
                            {...rest}
                            ref={props.ref}
                            style={{
                                ...props.style,
                                height: '20px',
                                width: '20px',
                                backgroundColor: '#3b82f6',
                                borderRadius: '50%',
                            }}
                        />
                    );
                }}
            />
            <div className="mt-2">
                {new Date(sliderValue[0]).toLocaleDateString()} — {new Date(sliderValue[1]).toLocaleDateString()}
            </div>
        </div>
    );
}