import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useSigner } from 'wagmi';
import bookLibABI from '../abi/BookLibrary.json';
import Button from '../components/ui/Button';

const BookLibrary = () => {
  const { data: signer } = useSigner();
  // sepolia:
  // const contractAddress = '0xA8E46754033a8Fa049Fe602418B3B9D4B630fc94';
  // localhost:
  const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  // Contract states
  const [contract, setContract] = useState();
  const [contractData, setContractData] = useState({});
  const [isLoadingContractData, setIsLoadingContractData] = useState(true);

  const [isHolderChanging, setIsHolderChanging] = useState(false);
  const [holderChangingError, setHolderChangingError] = useState('');

  const initialAddBookFormData = {
    title: '',
    copies: 0,
  };

  // Add book form data
  const [addBookFormData, setAddBookFormData] = useState(initialAddBookFormData);
  const [isAdding, setIsAdding] = useState(false);
  const [addingError, setAddingError] = useState('');

  const getTitle = titleWithSuffix => {
    const titleAvailSuffix = ' is available';
    const titileNotAvailSuffix = ' is not available';
    const result = titleWithSuffix.replace(titleAvailSuffix, '').replace(titileNotAvailSuffix, '');
    return result;
  };

  const getContractData = useCallback(async () => {
    setIsLoadingContractData(true);
    // TODO: getAvailableBook method can be refactored to return title to bool instead of string[]
    const allBooks = await contract.getAvailableBooks();
    const availableBookTitles = allBooks.map(titleWitSuffix => getTitle(titleWitSuffix));
    const isBorrowed = await Promise.all(
      availableBookTitles.map(title => contract.isBorrowed(title)),
    );
    for (let i = 0; i < availableBookTitles.length; i++) {
      console.log(`${availableBookTitles[i]} : ${isBorrowed[i]}`);
    }

    setContractData({ allBooks });
    setIsLoadingContractData(false);
  }, [contract]);

  const borrowBook = async titleWithSuffix => {
    setHolderChangingError('');
    setIsHolderChanging(true);
    const title = getTitle(titleWithSuffix);
    try {
      const borrowTx = await contract.borrowBook(title);
      await borrowTx;
    } catch (e) {
      console.error(`Cannot borrow book ${title}`, e.reason);
      setHolderChangingError(e.reason);
    } finally {
      setIsHolderChanging(false);
    }
  };

  const returnBook = async titleWithSuffix => {
    setHolderChangingError('');
    setIsHolderChanging(true);
    const title = getTitle(titleWithSuffix);
    try {
      const returnBookTx = await contract.returnBook(title);
      await returnBookTx;
    } catch (e) {
      console.error(`Cannot return book ${title}`, e.reason);
      setHolderChangingError(e.reason);
    } finally {
      setIsHolderChanging(false);
    }
  };

  // Handlers
  const handleAddBookFormInputChange = e => {
    const { value, name } = e.target;

    setAddBookFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddBookButtonClick = async () => {
    // Client-side validation;
    const { title, copies } = addBookFormData;
    if (!title) {
      setAddingError('No title provided');
      return;
    }
    if (!copies) {
      setAddingError('Copies must be greater or equal to 1');
      return;
    }
    setAddingError('');
    setIsAdding(true);
    try {
      const addBookTx = await contract.addBook(title, copies);
      await addBookTx;
      setAddBookFormData(initialAddBookFormData);
      await getContractData();
    } catch (e) {
      setAddingError();
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancelAddBookButtonClick = () => {
    setAddingError('');
    setAddBookFormData(initialAddBookFormData);
    // TODO: Add navigation to book list view
  };

  // Use effects
  useEffect(() => {
    if (signer) {
      const bookLibraryContract = new ethers.Contract(contractAddress, bookLibABI, signer);
      setContract(bookLibraryContract);
    }
  }, [signer]);

  useEffect(() => {
    contract && getContractData();
  }, [contract, getContractData]);

  return (
    <>
      {/* TODO: Add placeholder text when not connected  */}
      {/* TODO: Show add book form only when contract owner */}
      <AddBookForm
        addBookFormData={addBookFormData}
        handleAddBookFormInputChange={handleAddBookFormInputChange}
        handleAddBookButtonClick={handleAddBookButtonClick}
        handleCancelAddBookButtonClick={handleCancelAddBookButtonClick}
        isAdding={isAdding}
        addingError={addingError}
      />
      <BookList
        titles={contractData?.allBooks}
        onBorrowBook={borrowBook}
        onReturnBook={returnBook}
        isHolderChanging={isHolderChanging}
        holderChangingError={holderChangingError}
      />
    </>
  );
};

function AddBookForm(props) {
  const addBookFormData = props.addBookFormData;
  const addingError = props.addingError;
  const isAdding = props.isAdding;
  const handleAddBookFormInputChange = props.handleAddBookFormInputChange;
  const handleAddBookButtonClick = props.handleAddBookButtonClick;
  const handleCancelAddBookButtonClick = props.handleCancelAddBookButtonClick;
  return (
    <div className="container my-5 my-lg-10">
      <div className="row">
        <div className="col-6 offset-3">
          <h2 className="heading-medium text-center mb-5">Add Book</h2>
          <div className="card mt-5">
            <div className="card-body">
              <div className="">
                {addingError ? <div className="alert alert-danger mb-4">{addingError}</div> : null}
                <div>
                  <p className="text-small text-bold">Title:</p>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    value={addBookFormData.title}
                    onChange={handleAddBookFormInputChange}
                  />
                </div>
                <div className="mt-4">
                  <p className="text-small text-bold">Copies:</p>
                  <input
                    type="text"
                    className="form-control"
                    name="copies"
                    value={addBookFormData.copies}
                    onChange={handleAddBookFormInputChange}
                  />
                </div>
                <div className="mt-4 d-flex justify-content-center">
                  <Button onClick={handleAddBookButtonClick} loading={isAdding} type="primary">
                    Add Book
                  </Button>

                  <Button
                    className="ms-2"
                    onClick={handleCancelAddBookButtonClick}
                    loading={isAdding}
                    type="secondary"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// TODO: Move components to separate files
function BookList(props) {
  // TODO: Is it a good practice to define prop variables on top or directly reuse ?
  const titles = props.titles;
  const holderChangingError = props.holderChangingError;
  // TODO: Use spinner on the whole card
  const isHolderChanging = props.isHolderChanging;
  const onBorrowBook = props.onBorrowBook;
  const onReturnBook = props.onReturnBook;
  console.log('Booklist titles:', titles);

  const listItems = titles?.map(title => (
    <div key={title.toString()}>
      <div className="text-center">{title}</div>
      <Button onClick={() => onBorrowBook(title)} loading={isHolderChanging} type="primary">
        Borrow Book
      </Button>
      <Button
        className="ms-2"
        onClick={() => onReturnBook(title)}
        loading={isHolderChanging}
        type="secondary"
      >
        Return Book
      </Button>
    </div>
  ));
  return (
    <div className="container my-5 my-lg-10">
      <div className="row">
        <div className="col-6 offset-3">
          <h2 className="heading-medium text-center mb-5">Book List</h2>
          <div className="card mt-5">
            <div className="card-body">
              {!titles?.length ? (
                <div className="text-center">There are no books </div>
              ) : (
                <div className="">
                  <div>
                    {holderChangingError ? (
                      <div className="alert alert-danger mb-4">{holderChangingError}</div>
                    ) : null}
                    <div className="text-center">{listItems}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookLibrary;
