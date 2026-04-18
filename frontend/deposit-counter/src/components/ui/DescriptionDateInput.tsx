interface DescriptionDateInputProps {
  description: string;
  setDescription: (value: string) => void;
  descriptionError: string;
  setDescriptionError: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  descriptionRef?: React.RefObject<HTMLInputElement | null>;
}

export default function DescriptionDateInput({
  description,
  setDescription,
  descriptionError,
  setDescriptionError,
  date,
  setDate,
  descriptionRef,
}: DescriptionDateInputProps) {
  const validateDescription = (value: string) => {
    if (!value.trim()) {
      setDescriptionError("Description is required.");
      return false;
    } else {
      setDescriptionError("");
      return true;
    }
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Description"
          value={description}
          ref={descriptionRef}
          onBlur={() => validateDescription(description)}
          onChange={(e) => {
            setDescription(e.target.value);
            validateDescription(e.target.value);
          }}
          className={`input input-bordered ${descriptionError && "input-error"} flex-1 text-lg`}
        />
        <input
          type="date"
          value={date || ""}
          onChange={(e) => setDate(e.target.value)}
          className="input input-bordered w-40 text-lg"
        />
      </div>
      <div
        className={`text-error text-sm mt-1 ${descriptionError ? "" : "invisible"}`}
        role="alert"
      >
        {descriptionError || "\u00A0"}
      </div>
    </>
  );
}
